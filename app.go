package main

import (
	"context"
	"fmt"
	"sort"
	"sync"
	"time"

	"gh-relation-graph/internal/cache"
	"gh-relation-graph/internal/config"
	ghclient "gh-relation-graph/internal/github"
	"gh-relation-graph/internal/graph"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// AuthStatus represents the current authentication state
type AuthStatus struct {
	IsAuthenticated bool            `json:"isAuthenticated"`
	User            *graph.UserNode `json:"user"`
}

// RateLimitInfo represents rate limit status
type RateLimitInfo struct {
	Remaining int       `json:"remaining"`
	Limit     int       `json:"limit"`
	ResetAt   time.Time `json:"resetAt"`
}

// OAuthPollResult represents the result of a single OAuth poll attempt
type OAuthPollResult struct {
	Done    bool   `json:"done"`
	Error   string `json:"error"`
}

const githubClientID = "Ov23liDB47DWgD7ZQzz5"

// App struct
type App struct {
	ctx           context.Context
	mu            sync.Mutex
	token         string
	ghClient      *ghclient.Client
	cache         *cache.Cache
	cancelBFS     context.CancelFunc
	deviceCode    string
	oauthInterval int
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		cache: cache.New(30*time.Minute, 1000),
	}
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Restore saved token
	if saved := config.LoadToken(); saved != "" {
		a.token = saved
		a.ghClient = ghclient.New(saved)
		fmt.Println("[Startup] Restored saved token")
	}
}

// shutdown is called when the app closes
func (a *App) shutdown(ctx context.Context) {}

// SetToken sets the GitHub personal access token and initializes the client
func (a *App) SetToken(token string) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	a.token = token
	a.ghClient = ghclient.New(token)

	// Verify token by fetching authenticated user
	_, err := a.ghClient.GetUser(a.ctx, "")
	if err != nil {
		a.token = ""
		a.ghClient = nil
		return fmt.Errorf("invalid token: %w", err)
	}

	config.SaveToken(token)
	return nil
}

// Logout clears the stored token
func (a *App) Logout() {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.token = ""
	a.ghClient = nil
	a.deviceCode = ""
	config.DeleteToken()
}

// StartDeviceFlow initiates the GitHub OAuth Device Flow
func (a *App) StartDeviceFlow() (*ghclient.DeviceFlowResult, error) {
	result, err := ghclient.RequestDeviceCode(githubClientID)
	if err != nil {
		return nil, fmt.Errorf("failed to start device flow: %w", err)
	}

	a.mu.Lock()
	a.deviceCode = result.DeviceCode
	a.oauthInterval = result.Interval
	a.mu.Unlock()

	// Auto-open browser
	wailsruntime.BrowserOpenURL(a.ctx, result.VerificationURI)

	return result, nil
}

// PollOAuthOnce makes a single token exchange attempt (non-blocking).
// Returns {done: true} when authorized, {done: false} when still pending,
// or {error: "..."} on terminal failure.
func (a *App) PollOAuthOnce() *OAuthPollResult {
	a.mu.Lock()
	deviceCode := a.deviceCode
	a.mu.Unlock()

	if deviceCode == "" {
		return &OAuthPollResult{Error: "no device flow in progress"}
	}

	token, done, err := ghclient.RequestToken(githubClientID, deviceCode)
	if err != nil {
		fmt.Println("[OAuth] RequestToken error:", err)
		return &OAuthPollResult{Error: err.Error()}
	}
	if !done {
		return &OAuthPollResult{Done: false}
	}

	fmt.Printf("[OAuth] Got token: %s...\n", token[:min(8, len(token))])

	// Set up client with the obtained token
	client := ghclient.New(token)

	// Verify it works
	fmt.Println("[OAuth] Verifying token...")
	_, verifyErr := client.GetUser(a.ctx, "")
	if verifyErr != nil {
		fmt.Println("[OAuth] Verification failed:", verifyErr)
		return &OAuthPollResult{Error: fmt.Sprintf("token verification failed: %v", verifyErr)}
	}

	a.mu.Lock()
	a.token = token
	a.ghClient = client
	a.deviceCode = ""
	a.mu.Unlock()

	config.SaveToken(token)
	fmt.Println("[OAuth] Success! Client is set up.")
	return &OAuthPollResult{Done: true}
}

// CancelOAuth cancels an in-progress OAuth device flow
func (a *App) CancelOAuth() {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.deviceCode = ""
}

// GetAuthStatus returns the current authentication status
func (a *App) GetAuthStatus() *AuthStatus {
	a.mu.Lock()
	client := a.ghClient
	a.mu.Unlock()

	fmt.Printf("[AuthStatus] client == nil: %v\n", client == nil)

	if client == nil {
		return &AuthStatus{IsAuthenticated: false}
	}

	user, err := client.GetUser(a.ctx, "")
	if err != nil {
		fmt.Println("[AuthStatus] GetUser error:", err)
		return &AuthStatus{IsAuthenticated: false}
	}

	fmt.Printf("[AuthStatus] Authenticated as: %s\n", user.GetLogin())
	return &AuthStatus{
		IsAuthenticated: true,
		User:            graph.ToUserNode(user, 0),
	}
}

// BuildGraph performs BFS traversal and returns the relationship graph
func (a *App) BuildGraph(username string, depth int) (*graph.Graph, error) {
	a.mu.Lock()
	client := a.ghClient
	a.mu.Unlock()

	if client == nil {
		return nil, fmt.Errorf("not authenticated, please set token first")
	}

	if depth < 1 {
		depth = 1
	}
	if depth > 3 {
		depth = 3
	}

	ctx, cancel := context.WithCancel(a.ctx)
	a.mu.Lock()
	a.cancelBFS = cancel
	a.mu.Unlock()

	defer func() {
		a.mu.Lock()
		a.cancelBFS = nil
		a.mu.Unlock()
		cancel()
	}()

	onProgress := func(p graph.BFSProgress) {
		wailsruntime.EventsEmit(a.ctx, "bfs:progress", p)
	}

	g, err := graph.BuildGraph(ctx, client, a.cache, username, depth, onProgress)
	if err != nil && ctx.Err() != nil {
		// Cancelled, return partial result
		return g, nil
	}
	return g, err
}

// CancelBuild cancels an in-progress BFS traversal
func (a *App) CancelBuild() {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.cancelBFS != nil {
		a.cancelBFS()
	}
}

// GetGraphStats computes statistics from a graph
func (a *App) GetGraphStats(g *graph.Graph) *graph.GraphStats {
	if g == nil {
		return &graph.GraphStats{}
	}

	stats := &graph.GraphStats{
		TotalNodes:   len(g.Nodes),
		TotalEdges:   len(g.Edges),
		NodesByDepth: make(map[int]int),
	}

	// Count nodes by depth
	for _, n := range g.Nodes {
		stats.NodesByDepth[n.Depth]++
	}

	// Mutual follows count
	edgeSet := make(map[string]bool)
	for _, e := range g.Edges {
		edgeSet[e.Source+"|"+e.Target] = true
	}
	seen := make(map[string]bool)
	for _, e := range g.Edges {
		if edgeSet[e.Target+"|"+e.Source] {
			key := e.Source + "|" + e.Target
			reverseKey := e.Target + "|" + e.Source
			if !seen[key] && !seen[reverseKey] {
				seen[key] = true
				stats.MutualFollows++
			}
		}
	}

	// Top followed & following
	nodes := make([]graph.UserNode, len(g.Nodes))
	copy(nodes, g.Nodes)

	sort.Slice(nodes, func(i, j int) bool {
		return nodes[i].Followers > nodes[j].Followers
	})
	limit := 10
	if len(nodes) < limit {
		limit = len(nodes)
	}
	stats.TopFollowed = nodes[:limit]

	sort.Slice(nodes, func(i, j int) bool {
		return nodes[i].Following > nodes[j].Following
	})
	if len(nodes) < 10 {
		limit = len(nodes)
	} else {
		limit = 10
	}
	stats.TopFollowing = nodes[:limit]

	// Averages
	var totalFollowers, totalFollowing int
	for _, n := range g.Nodes {
		totalFollowers += n.Followers
		totalFollowing += n.Following
	}
	if len(g.Nodes) > 0 {
		stats.AvgFollowers = float64(totalFollowers) / float64(len(g.Nodes))
		stats.AvgFollowing = float64(totalFollowing) / float64(len(g.Nodes))
	}

	return stats
}

// FindMutualFollows returns all mutual follow edges in the graph
func (a *App) FindMutualFollows(g *graph.Graph) []graph.Edge {
	return graph.FindMutualFollows(g)
}

// FindMutualFollowsBetween finds users that both userA and userB follow
func (a *App) FindMutualFollowsBetween(userA, userB string) (*graph.MutualFollowResult, error) {
	a.mu.Lock()
	client := a.ghClient
	a.mu.Unlock()

	if client == nil {
		return nil, fmt.Errorf("not authenticated")
	}

	return graph.FindMutualFollowsBetween(a.ctx, client, a.cache, userA, userB)
}

// FetchFollowList returns the followers and following lists for a user without BFS
func (a *App) FetchFollowList(username string) (*graph.FollowListResult, error) {
	a.mu.Lock()
	client := a.ghClient
	a.mu.Unlock()

	if client == nil {
		return nil, fmt.Errorf("not authenticated, please set token first")
	}

	return graph.FetchFollowList(a.ctx, client, a.cache, username)
}

// FetchFollowListForUsers fetches followers/following for multiple users, excluding known logins
func (a *App) FetchFollowListForUsers(logins []string, excludeLogins []string, depth int) (*graph.FollowListResult, error) {
	a.mu.Lock()
	client := a.ghClient
	a.mu.Unlock()

	if client == nil {
		return nil, fmt.Errorf("not authenticated, please set token first")
	}

	ctx, cancel := context.WithCancel(a.ctx)
	a.mu.Lock()
	a.cancelBFS = cancel
	a.mu.Unlock()

	defer func() {
		a.mu.Lock()
		a.cancelBFS = nil
		a.mu.Unlock()
		cancel()
	}()

	return graph.FetchFollowListForUsers(ctx, client, a.cache, logins, excludeLogins, depth)
}

// BuildGraphFromSelected builds a graph from selected users at each depth level
func (a *App) BuildGraphFromSelected(centerUser string, selectedByDepth map[int][]string) (*graph.Graph, error) {
	a.mu.Lock()
	client := a.ghClient
	a.mu.Unlock()

	if client == nil {
		return nil, fmt.Errorf("not authenticated, please set token first")
	}

	ctx, cancel := context.WithCancel(a.ctx)
	a.mu.Lock()
	a.cancelBFS = cancel
	a.mu.Unlock()

	defer func() {
		a.mu.Lock()
		a.cancelBFS = nil
		a.mu.Unlock()
		cancel()
	}()

	onProgress := func(p graph.BFSProgress) {
		wailsruntime.EventsEmit(a.ctx, "bfs:progress", p)
	}

	g, err := graph.BuildGraphFromSelected(ctx, client, a.cache, centerUser, selectedByDepth, onProgress)
	if err != nil && ctx.Err() != nil {
		return g, nil
	}
	return g, err
}

// GetUser fetches a single user profile
func (a *App) GetUser(username string) (*graph.UserNode, error) {
	a.mu.Lock()
	client := a.ghClient
	a.mu.Unlock()

	if client == nil {
		return nil, fmt.Errorf("not authenticated")
	}

	user, err := client.GetUser(a.ctx, username)
	if err != nil {
		return nil, err
	}
	return graph.ToUserNode(user, 0), nil
}

// ClearCache clears the API cache
func (a *App) ClearCache() {
	a.cache.Clear()
}

// GetRateLimitInfo returns current rate limit status
func (a *App) GetRateLimitInfo() *RateLimitInfo {
	a.mu.Lock()
	client := a.ghClient
	a.mu.Unlock()

	if client == nil {
		return &RateLimitInfo{}
	}

	remaining, limit, resetAt := client.GetRateLimitInfo()
	return &RateLimitInfo{
		Remaining: remaining,
		Limit:     limit,
		ResetAt:   resetAt,
	}
}

// OpenURL opens a URL in the system browser
func (a *App) OpenURL(url string) {
	wailsruntime.BrowserOpenURL(a.ctx, url)
}
