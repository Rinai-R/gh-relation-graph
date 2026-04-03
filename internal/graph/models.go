package graph

// UserNode represents a GitHub user as a graph node
type UserNode struct {
	Login     string `json:"login"`
	ID        int64  `json:"id"`
	AvatarURL string `json:"avatarUrl"`
	Name      string `json:"name"`
	Bio       string `json:"bio"`
	Company   string `json:"company"`
	Location  string `json:"location"`
	Followers int    `json:"followers"`
	Following int    `json:"following"`
	Depth     int    `json:"depth"`
}

// Edge represents a follow relationship (Source follows Target)
type Edge struct {
	Source string `json:"source"`
	Target string `json:"target"`
}

// Graph is the full network result
type Graph struct {
	Nodes      []UserNode `json:"nodes"`
	Edges      []Edge     `json:"edges"`
	CenterUser string     `json:"centerUser"`
	MaxDepth   int        `json:"maxDepth"`
}

// MutualFollowResult holds mutual follow data between two users
type MutualFollowResult struct {
	UserA       string     `json:"userA"`
	UserB       string     `json:"userB"`
	MutualUsers []UserNode `json:"mutualUsers"`
	Count       int        `json:"count"`
}

// GraphStats holds statistics about the graph
type GraphStats struct {
	TotalNodes    int            `json:"totalNodes"`
	TotalEdges    int            `json:"totalEdges"`
	MutualFollows int            `json:"mutualFollows"`
	NodesByDepth  map[int]int    `json:"nodesByDepth"`
	TopFollowed   []UserNode     `json:"topFollowed"`
	TopFollowing  []UserNode     `json:"topFollowing"`
	AvgFollowers  float64        `json:"avgFollowers"`
	AvgFollowing  float64        `json:"avgFollowing"`
}

// FollowListResult holds the followers and following lists for a user
type FollowListResult struct {
	Followers []UserNode `json:"followers"`
	Following []UserNode `json:"following"`
}

// BFSProgress is emitted as an event during traversal
type BFSProgress struct {
	CurrentUser  string `json:"currentUser"`
	CurrentDepth int    `json:"currentDepth"`
	NodesFound   int    `json:"nodesFound"`
	EdgesFound   int    `json:"edgesFound"`
	QueueSize    int    `json:"queueSize"`
	Status       string `json:"status"` // "running", "rate_limited", "completed", "error"
}
