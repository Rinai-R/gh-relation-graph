package github

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	deviceCodeURL = "https://github.com/login/device/code"
	tokenURL      = "https://github.com/login/oauth/access_token"
	oauthScope    = "read:user"
)

// DeviceFlowResult holds the response from GitHub's device code request
type DeviceFlowResult struct {
	DeviceCode      string `json:"deviceCode"`
	UserCode        string `json:"userCode"`
	VerificationURI string `json:"verificationUri"`
	ExpiresIn       int    `json:"expiresIn"`
	Interval        int    `json:"interval"`
}

// RequestDeviceCode initiates the device flow by requesting a device code
func RequestDeviceCode(clientID string) (*DeviceFlowResult, error) {
	data := url.Values{
		"client_id": {clientID},
		"scope":     {oauthScope},
	}

	req, err := http.NewRequest("POST", deviceCodeURL, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to request device code: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub returned status %d: %s", resp.StatusCode, string(body))
	}

	var ghResp struct {
		DeviceCode      string `json:"device_code"`
		UserCode        string `json:"user_code"`
		VerificationURI string `json:"verification_uri"`
		ExpiresIn       int    `json:"expires_in"`
		Interval        int    `json:"interval"`
	}
	if err := json.Unmarshal(body, &ghResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if ghResp.Interval < 5 {
		ghResp.Interval = 5
	}

	return &DeviceFlowResult{
		DeviceCode:      ghResp.DeviceCode,
		UserCode:        ghResp.UserCode,
		VerificationURI: ghResp.VerificationURI,
		ExpiresIn:       ghResp.ExpiresIn,
		Interval:        ghResp.Interval,
	}, nil
}

// PollForToken polls GitHub for the access token after user authorizes
func PollForToken(ctx context.Context, clientID, deviceCode string, interval int) (string, error) {
	ticker := time.NewTicker(time.Duration(interval) * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return "", ctx.Err()
		case <-ticker.C:
			token, done, err := RequestToken(clientID, deviceCode)
			if err != nil {
				return "", err
			}
			if done {
				return token, nil
			}
			// not done yet, continue polling
		}
	}
}

// RequestToken makes a single token exchange attempt. Returns (token, done, error).
// done=true means success (token is valid) or a terminal error occurred.
func RequestToken(clientID, deviceCode string) (token string, done bool, err error) {
	data := url.Values{
		"client_id":   {clientID},
		"device_code": {deviceCode},
		"grant_type":  {"urn:ietf:params:oauth:grant-type:device_code"},
	}

	req, err := http.NewRequest("POST", tokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return "", false, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", false, fmt.Errorf("failed to request token: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", false, fmt.Errorf("failed to read response: %w", err)
	}

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		TokenType   string `json:"token_type"`
		Scope       string `json:"scope"`
		Error       string `json:"error"`
	}
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return "", false, fmt.Errorf("failed to parse response: %w", err)
	}

	switch tokenResp.Error {
	case "":
		if tokenResp.AccessToken == "" {
			return "", false, fmt.Errorf("GitHub returned empty access token")
		}
		return tokenResp.AccessToken, true, nil
	case "authorization_pending":
		// User hasn't authorized yet, keep polling
		return "", false, nil
	case "slow_down":
		// Need to slow down polling (handled by interval)
		return "", false, nil
	case "expired_token":
		return "", false, fmt.Errorf("device code expired, please try again")
	case "access_denied":
		return "", false, fmt.Errorf("authorization was denied by user")
	default:
		return "", false, fmt.Errorf("OAuth error: %s", tokenResp.Error)
	}
}
