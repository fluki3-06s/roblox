package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type luarmorClient struct {
	baseURL string
	apiKey  string
	client  *http.Client
}

func newLuarmorClient(baseURL, apiKey string) *luarmorClient {
	return &luarmorClient{
		baseURL: baseURL,
		apiKey:  apiKey,
		client:  &http.Client{Timeout: 15 * time.Second},
	}
}

// addUser creates a new key via Luarmor API with auth_expire in hours
func (c *luarmorClient) addUser(ctx context.Context, expireHours int) (string, error) {
	expireAt := time.Now().Add(time.Duration(expireHours) * time.Hour).Unix()

	body := map[string]interface{}{
		"auth_expire": expireAt,
	}
	bs, _ := json.Marshal(body)

	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/users", bytes.NewReader(bs))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	b, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("luarmor api: %s", string(b))
	}

	var result struct {
		Key string `json:"key"`
	}
	if err := json.Unmarshal(b, &result); err != nil {
		return "", err
	}
	return result.Key, nil
}

// validateKey checks if key is valid via Luarmor External Check API
func (c *luarmorClient) validateKey(ctx context.Context, key string) (bool, error) {
	url := fmt.Sprintf("%s/external_check?key=%s", c.baseURL, key)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return false, err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.client.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	b, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return false, nil
	}

	var result struct {
		Status string `json:"status"`
	}
	json.Unmarshal(b, &result)
	return result.Status == "KEY_VALID", nil
}
