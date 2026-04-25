package main

import "os"

type config struct {
	SupabaseURL    string
	SupabaseKey    string
	LuarmorAPIURL  string
	LuarmorAPIKey  string
	PostbackSecret string
}

func loadConfig() config {
	return config{
		SupabaseURL:    os.Getenv("SUPABASE_URL"),
		SupabaseKey:    os.Getenv("SUPABASE_SERVICE_KEY"),
		LuarmorAPIURL:  getEnv("LUARMOR_API_URL", "https://api.luarmor.net/v1"),
		LuarmorAPIKey:  os.Getenv("LUARMOR_API_KEY"),
		PostbackSecret: os.Getenv("MONETAG_POSTBACK_SECRET"),
	}
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
