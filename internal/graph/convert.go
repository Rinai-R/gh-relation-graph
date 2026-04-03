package graph

import (
	gh "github.com/google/go-github/v68/github"
)

// ToUserNode converts a GitHub User to our UserNode model
func ToUserNode(u *gh.User, depth int) *UserNode {
	if u == nil {
		return nil
	}
	node := &UserNode{
		ID:    u.GetID(),
		Login: u.GetLogin(),
		Depth: depth,
	}
	if u.AvatarURL != nil {
		node.AvatarURL = u.GetAvatarURL()
	}
	if u.Name != nil {
		node.Name = u.GetName()
	}
	if u.Bio != nil {
		node.Bio = u.GetBio()
	}
	if u.Company != nil {
		node.Company = u.GetCompany()
	}
	if u.Location != nil {
		node.Location = u.GetLocation()
	}
	if u.Followers != nil {
		node.Followers = u.GetFollowers()
	}
	if u.Following != nil {
		node.Following = u.GetFollowing()
	}
	return node
}
