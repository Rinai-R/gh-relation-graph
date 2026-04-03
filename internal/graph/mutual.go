package graph

import (
	"context"

	"gh-relation-graph/internal/cache"
	ghclient "gh-relation-graph/internal/github"

	gh "github.com/google/go-github/v68/github"
)

// FindMutualFollows returns all mutual follow pairs in the graph
func FindMutualFollows(g *Graph) []Edge {
	if g == nil {
		return nil
	}

	edgeSet := make(map[string]bool)
	for _, e := range g.Edges {
		edgeSet[e.Source+"|"+e.Target] = true
	}

	seen := make(map[string]bool)
	var mutual []Edge
	for _, e := range g.Edges {
		if edgeSet[e.Target+"|"+e.Source] {
			// Deduplicate: only keep pair where Source < Target lexicographically
			var key string
			if e.Source < e.Target {
				key = e.Source + "|" + e.Target
			} else {
				key = e.Target + "|" + e.Source
			}
			if !seen[key] {
				seen[key] = true
				mutual = append(mutual, Edge{Source: e.Source, Target: e.Target})
			}
		}
	}
	return mutual
}

// FindMutualFollowsBetween finds users that both userA and userB follow
func FindMutualFollowsBetween(ctx context.Context, client *ghclient.Client, c *cache.Cache,
	userA, userB string) (*MutualFollowResult, error) {

	followingA, err := fetchFollowingCached(ctx, client, c, userA)
	if err != nil {
		return nil, err
	}

	followingB, err := fetchFollowingCached(ctx, client, c, userB)
	if err != nil {
		return nil, err
	}

	// Build set from B's following
	setB := make(map[string]bool)
	mapB := make(map[string]*gh.User)
	for _, u := range followingB {
		setB[u.GetLogin()] = true
		mapB[u.GetLogin()] = u
	}

	// Intersect
	var mutualUsers []UserNode
	for _, u := range followingA {
		login := u.GetLogin()
		if setB[login] {
			node := ToUserNode(u, -1)
			if node != nil {
				mutualUsers = append(mutualUsers, *node)
			}
		}
	}

	return &MutualFollowResult{
		UserA:       userA,
		UserB:       userB,
		MutualUsers: mutualUsers,
		Count:       len(mutualUsers),
	}, nil
}
