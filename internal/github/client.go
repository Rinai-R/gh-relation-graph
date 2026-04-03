package github

import (
	"context"
	"sync"
	"time"

	gh "github.com/google/go-github/v68/github"
	"golang.org/x/oauth2"
)

// Client wraps the GitHub API client with rate limiting
type Client struct {
	gh *gh.Client

	mu        sync.Mutex
	remaining int
	limit     int
	resetTime time.Time
}

// New creates a new authenticated GitHub client
func New(token string) *Client {
	ts := oauth2.StaticTokenSource(&oauth2.Token{AccessToken: token})
	tc := oauth2.NewClient(context.Background(), ts)
	return &Client{
		gh:        gh.NewClient(tc),
		remaining: 5000,
		limit:     5000,
	}
}

// updateRateLimit updates rate limit info from a GitHub API response
func (c *Client) updateRateLimit(resp *gh.Response) {
	if resp == nil {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	c.remaining = resp.Rate.Remaining
	c.limit = resp.Rate.Limit
	c.resetTime = resp.Rate.Reset.Time
}

// waitIfNeeded blocks until rate limit resets if remaining is low
func (c *Client) waitIfNeeded(ctx context.Context) error {
	c.mu.Lock()
	remaining := c.remaining
	resetTime := c.resetTime
	c.mu.Unlock()

	if remaining > 10 {
		return nil
	}

	waitDuration := time.Until(resetTime) + time.Second
	if waitDuration <= 0 {
		return nil
	}

	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-time.After(waitDuration):
		return nil
	}
}

// GetRateLimitInfo returns current rate limit info
func (c *Client) GetRateLimitInfo() (remaining, limit int, resetAt time.Time) {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.remaining, c.limit, c.resetTime
}

// GetUser returns a user profile. Pass empty string for authenticated user.
func (c *Client) GetUser(ctx context.Context, username string) (*gh.User, error) {
	if err := c.waitIfNeeded(ctx); err != nil {
		return nil, err
	}

	var user *gh.User
	var resp *gh.Response
	var err error

	if username == "" {
		user, resp, err = c.gh.Users.Get(ctx, "")
	} else {
		user, resp, err = c.gh.Users.Get(ctx, username)
	}
	c.updateRateLimit(resp)
	if err != nil {
		return nil, err
	}
	return user, nil
}

// ListAllFollowers returns all followers for a user (handles pagination)
func (c *Client) ListAllFollowers(ctx context.Context, username string) ([]*gh.User, error) {
	var allUsers []*gh.User
	opts := &gh.ListOptions{PerPage: 100}

	for {
		if err := c.waitIfNeeded(ctx); err != nil {
			return allUsers, err
		}

		users, resp, err := c.gh.Users.ListFollowers(ctx, username, opts)
		c.updateRateLimit(resp)
		if err != nil {
			return allUsers, err
		}
		allUsers = append(allUsers, users...)

		if resp.NextPage == 0 {
			break
		}
		opts.Page = resp.NextPage
	}
	return allUsers, nil
}

// ListAllFollowing returns all users a user follows (handles pagination)
func (c *Client) ListAllFollowing(ctx context.Context, username string) ([]*gh.User, error) {
	var allUsers []*gh.User
	opts := &gh.ListOptions{PerPage: 100}

	for {
		if err := c.waitIfNeeded(ctx); err != nil {
			return allUsers, err
		}

		users, resp, err := c.gh.Users.ListFollowing(ctx, username, opts)
		c.updateRateLimit(resp)
		if err != nil {
			return allUsers, err
		}
		allUsers = append(allUsers, users...)

		if resp.NextPage == 0 {
			break
		}
		opts.Page = resp.NextPage
	}
	return allUsers, nil
}
