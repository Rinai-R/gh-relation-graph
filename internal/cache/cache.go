package cache

import (
	"sync"
	"time"
)

type cacheItem struct {
	value     interface{}
	expiresAt time.Time
}

// Cache is a simple in-memory cache with TTL and max size
type Cache struct {
	mu      sync.RWMutex
	items   map[string]*cacheItem
	ttl     time.Duration
	maxSize int
}

// New creates a new Cache
func New(ttl time.Duration, maxSize int) *Cache {
	return &Cache{
		items:   make(map[string]*cacheItem),
		ttl:     ttl,
		maxSize: maxSize,
	}
}

// Get returns a cached value if it exists and hasn't expired
func (c *Cache) Get(key string) (interface{}, bool) {
	c.mu.RLock()
	item, ok := c.items[key]
	c.mu.RUnlock()

	if !ok {
		return nil, false
	}
	if time.Now().After(item.expiresAt) {
		c.mu.Lock()
		delete(c.items, key)
		c.mu.Unlock()
		return nil, false
	}
	return item.value, true
}

// Set stores a value in the cache
func (c *Cache) Set(key string, value interface{}) {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Evict oldest if at capacity
	if len(c.items) >= c.maxSize {
		var oldestKey string
		var oldestTime time.Time
		first := true
		for k, v := range c.items {
			if first || v.expiresAt.Before(oldestTime) {
				oldestKey = k
				oldestTime = v.expiresAt
				first = false
			}
		}
		if oldestKey != "" {
			delete(c.items, oldestKey)
		}
	}

	c.items[key] = &cacheItem{
		value:     value,
		expiresAt: time.Now().Add(c.ttl),
	}
}

// Clear removes all items from the cache
func (c *Cache) Clear() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.items = make(map[string]*cacheItem)
}

// Size returns the current number of items in the cache
func (c *Cache) Size() int {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return len(c.items)
}
