package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
)

const appDirName = "gh-relation-graph"
const tokenFileName = "token.json"

type tokenFile struct {
	Token string `json:"token"`
}

// GetConfigDir returns the app config directory, creating it if needed.
func GetConfigDir() (string, error) {
	var base string
	switch runtime.GOOS {
	case "windows":
		base = os.Getenv("APPDATA")
	case "darwin":
		home, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		base = filepath.Join(home, "Library", "Application Support")
	default:
		if xdg := os.Getenv("XDG_CONFIG_HOME"); xdg != "" {
			base = xdg
		} else {
			home, err := os.UserHomeDir()
			if err != nil {
				return "", err
			}
			base = filepath.Join(home, ".config")
		}
	}

	dir := filepath.Join(base, appDirName)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return "", err
	}
	return dir, nil
}

// SaveToken persists the token to disk.
func SaveToken(token string) error {
	dir, err := GetConfigDir()
	if err != nil {
		return err
	}
	data, err := json.Marshal(&tokenFile{Token: token})
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(dir, tokenFileName), data, 0600)
}

// LoadToken reads the persisted token. Returns empty string if not found.
func LoadToken() string {
	dir, err := GetConfigDir()
	if err != nil {
		return ""
	}
	data, err := os.ReadFile(filepath.Join(dir, tokenFileName))
	if err != nil {
		return ""
	}
	var tf tokenFile
	if json.Unmarshal(data, &tf) != nil {
		return ""
	}
	return tf.Token
}

// DeleteToken removes the persisted token file.
func DeleteToken() {
	dir, err := GetConfigDir()
	if err != nil {
		return
	}
	os.Remove(filepath.Join(dir, tokenFileName))
}
