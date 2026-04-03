package graph

import (
	"context"
	"fmt"

	"gh-relation-graph/internal/cache"
	ghclient "gh-relation-graph/internal/github"

	gh "github.com/google/go-github/v68/github"
)

type queueItem struct {
	login string
	depth int
}

// BuildGraph performs BFS traversal from centerUser up to maxDepth
func BuildGraph(ctx context.Context, client *ghclient.Client, c *cache.Cache,
	centerUser string, maxDepth int, onProgress func(BFSProgress)) (*Graph, error) {

	visited := make(map[string]bool)
	queue := []queueItem{{login: centerUser, depth: 0}}
	var nodes []UserNode
	var edges []Edge
	edgeSet := make(map[string]bool)

	for len(queue) > 0 {
		select {
		case <-ctx.Done():
			return &Graph{
				Nodes: nodes, Edges: edges,
				CenterUser: centerUser, MaxDepth: maxDepth,
			}, ctx.Err()
		default:
		}

		item := queue[0]
		queue = queue[1:]

		if visited[item.login] {
			continue
		}
		visited[item.login] = true

		// Emit progress
		if onProgress != nil {
			onProgress(BFSProgress{
				CurrentUser:  item.login,
				CurrentDepth: item.depth,
				NodesFound:   len(nodes),
				EdgesFound:   len(edges),
				QueueSize:    len(queue),
				Status:       "running",
			})
		}

		// Fetch user profile
		user, err := fetchUserCached(ctx, client, c, item.login)
		if err != nil {
			continue
		}
		node := ToUserNode(user, item.depth)
		if node != nil {
			nodes = append(nodes, *node)
		}

		// Only explore connections if within depth limit
		if item.depth >= maxDepth {
			continue
		}

		// Fetch followers
		followers, err := fetchFollowersCached(ctx, client, c, item.login)
		if err == nil {
			for _, f := range followers {
				login := f.GetLogin()
				if login == "" {
					continue
				}
				edgeKey := login + "|" + item.login
				if !edgeSet[edgeKey] {
					edgeSet[edgeKey] = true
					edges = append(edges, Edge{Source: login, Target: item.login})
				}
				if !visited[login] {
					queue = append(queue, queueItem{login: login, depth: item.depth + 1})
				}
			}
		}

		// Fetch following
		following, err := fetchFollowingCached(ctx, client, c, item.login)
		if err == nil {
			for _, f := range following {
				login := f.GetLogin()
				if login == "" {
					continue
				}
				edgeKey := item.login + "|" + login
				if !edgeSet[edgeKey] {
					edgeSet[edgeKey] = true
					edges = append(edges, Edge{Source: item.login, Target: login})
				}
				if !visited[login] {
					queue = append(queue, queueItem{login: login, depth: item.depth + 1})
				}
			}
		}
	}

	// Final progress
	if onProgress != nil {
		onProgress(BFSProgress{
			NodesFound: len(nodes),
			EdgesFound: len(edges),
			Status:     "completed",
		})
	}

	return &Graph{
		Nodes:      nodes,
		Edges:      edges,
		CenterUser: centerUser,
		MaxDepth:   maxDepth,
	}, nil
}

// FetchFollowList retrieves followers and following lists for a user without BFS traversal
func FetchFollowList(ctx context.Context, client *ghclient.Client, c *cache.Cache, username string) (*FollowListResult, error) {
	// Fetch followers
	followers, err := fetchFollowersCached(ctx, client, c, username)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch followers: %w", err)
	}

	// Fetch following
	following, err := fetchFollowingCached(ctx, client, c, username)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch following: %w", err)
	}

	result := &FollowListResult{
		Followers: make([]UserNode, 0),
		Following: make([]UserNode, 0),
	}
	for _, f := range followers {
		node := ToUserNode(f, 1)
		if node != nil {
			result.Followers = append(result.Followers, *node)
		}
	}
	for _, f := range following {
		node := ToUserNode(f, 1)
		if node != nil {
			result.Following = append(result.Following, *node)
		}
	}
	return result, nil
}

// FetchFollowListForUsers retrieves followers and following for multiple users at once.
// Returns a combined FollowListResult with deduplicated users (excluding already known logins).
func FetchFollowListForUsers(ctx context.Context, client *ghclient.Client, c *cache.Cache,
	logins []string, excludeLogins []string, depth int) (*FollowListResult, error) {

	excludeSet := make(map[string]bool)
	for _, l := range excludeLogins {
		excludeSet[l] = true
	}

	seenFollowers := make(map[string]bool)
	seenFollowing := make(map[string]bool)
	result := &FollowListResult{
		Followers: make([]UserNode, 0),
		Following: make([]UserNode, 0),
	}

	for _, login := range logins {
		select {
		case <-ctx.Done():
			return result, ctx.Err()
		default:
		}

		followers, err := fetchFollowersCached(ctx, client, c, login)
		if err == nil {
			for _, f := range followers {
				fl := f.GetLogin()
				if fl == "" || excludeSet[fl] || seenFollowers[fl] {
					continue
				}
				seenFollowers[fl] = true
				node := ToUserNode(f, depth)
				if node != nil {
					result.Followers = append(result.Followers, *node)
				}
			}
		}

		following, err := fetchFollowingCached(ctx, client, c, login)
		if err == nil {
			for _, f := range following {
				fl := f.GetLogin()
				if fl == "" || excludeSet[fl] || seenFollowing[fl] {
					continue
				}
				seenFollowing[fl] = true
				node := ToUserNode(f, depth)
				if node != nil {
					result.Following = append(result.Following, *node)
				}
			}
		}
	}

	return result, nil
}

// BuildGraphFromSelected builds a graph from explicitly selected users at each depth level.
// selectedByDepth maps depth -> list of logins at that depth.
// It only creates edges between users where a follow relationship actually exists.
func BuildGraphFromSelected(ctx context.Context, client *ghclient.Client, c *cache.Cache,
	centerUser string, selectedByDepth map[int][]string, onProgress func(BFSProgress)) (*Graph, error) {

	var nodes []UserNode
	var edges []Edge
	edgeSet := make(map[string]bool)
	addedNodes := make(map[string]bool)

	emitProgress := func(currentUser string, depth int, status string) {
		if onProgress != nil {
			onProgress(BFSProgress{
				CurrentUser:  currentUser,
				CurrentDepth: depth,
				NodesFound:   len(nodes),
				EdgesFound:   len(edges),
				Status:       status,
			})
		}
	}

	// Add center user at depth 0
	emitProgress(centerUser, 0, "running")
	centerGHUser, err := fetchUserCached(ctx, client, c, centerUser)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch center user: %w", err)
	}
	centerNode := ToUserNode(centerGHUser, 0)
	if centerNode != nil {
		nodes = append(nodes, *centerNode)
		addedNodes[centerUser] = true
	}

	// Collect all selected users across all depths
	allSelected := make(map[string]int) // login -> depth
	allSelected[centerUser] = 0
	maxDepth := 0
	for d, logins := range selectedByDepth {
		if d > maxDepth {
			maxDepth = d
		}
		for _, l := range logins {
			allSelected[l] = d
		}
	}

	// Add selected users as nodes (by depth order)
	for d := 1; d <= maxDepth; d++ {
		logins, ok := selectedByDepth[d]
		if !ok {
			continue
		}
		for _, login := range logins {
			select {
			case <-ctx.Done():
				return &Graph{Nodes: nodes, Edges: edges, CenterUser: centerUser, MaxDepth: maxDepth}, ctx.Err()
			default:
			}

			if addedNodes[login] {
				continue
			}

			emitProgress(login, d, "running")

			user, err := fetchUserCached(ctx, client, c, login)
			if err != nil {
				continue
			}
			node := ToUserNode(user, d)
			if node != nil {
				nodes = append(nodes, *node)
				addedNodes[login] = true
			}
		}
	}

	// Build edges: for each added node, check follow relationships with other added nodes
	// We check the cached follower/following lists to determine edge direction
	for login := range addedNodes {
		select {
		case <-ctx.Done():
			return &Graph{Nodes: nodes, Edges: edges, CenterUser: centerUser, MaxDepth: maxDepth}, ctx.Err()
		default:
		}

		emitProgress(login, allSelected[login], "running")

		// Check who this user follows (among added nodes)
		following, _ := fetchFollowingCached(ctx, client, c, login)
		for _, f := range following {
			fl := f.GetLogin()
			if fl == "" || !addedNodes[fl] {
				continue
			}
			edgeKey := login + "|" + fl
			if !edgeSet[edgeKey] {
				edgeSet[edgeKey] = true
				edges = append(edges, Edge{Source: login, Target: fl})
			}
		}
	}

	emitProgress("", 0, "completed")

	return &Graph{
		Nodes:      nodes,
		Edges:      edges,
		CenterUser: centerUser,
		MaxDepth:   maxDepth,
	}, nil
}

func fetchUserCached(ctx context.Context, client *ghclient.Client, c *cache.Cache, login string) (*gh.User, error) {
	key := fmt.Sprintf("user:%s", login)
	if v, ok := c.Get(key); ok {
		return v.(*gh.User), nil
	}
	user, err := client.GetUser(ctx, login)
	if err != nil {
		return nil, err
	}
	c.Set(key, user)
	return user, nil
}

func fetchFollowersCached(ctx context.Context, client *ghclient.Client, c *cache.Cache, login string) ([]*gh.User, error) {
	key := fmt.Sprintf("followers:%s", login)
	if v, ok := c.Get(key); ok {
		return v.([]*gh.User), nil
	}
	users, err := client.ListAllFollowers(ctx, login)
	if err != nil {
		return nil, err
	}
	c.Set(key, users)
	return users, nil
}

func fetchFollowingCached(ctx context.Context, client *ghclient.Client, c *cache.Cache, login string) ([]*gh.User, error) {
	key := fmt.Sprintf("following:%s", login)
	if v, ok := c.Get(key); ok {
		return v.([]*gh.User), nil
	}
	users, err := client.ListAllFollowing(ctx, login)
	if err != nil {
		return nil, err
	}
	c.Set(key, users)
	return users, nil
}
