package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
)

type handler struct {
	db     *sql.DB
	config config
	luarmor *luarmorClient
}

func newHandler(db *sql.DB) *handler {
	cfg := loadConfig()
	return &handler{
		db:     db,
		config: cfg,
		luarmor: newLuarmorClient(cfg.LuarmorAPIURL, cfg.LuarmorAPIKey),
	}
}

func (h *handler) health(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

func (h *handler) getSessionCount(w http.ResponseWriter, r *http.Request) {
	ymid := chi.URLParam(r, "ymid")
	if ymid == "" {
		http.Error(w, "ymid required", http.StatusBadRequest)
		return
	}

	var count int
	var key sql.NullString
	var expiresAt sql.NullTime
	err := h.db.QueryRowContext(r.Context(),
		`SELECT ad_count, key_value, key_expires_at FROM sessions WHERE ymid = $1`,
		ymid,
	).Scan(&count, &key, &expiresAt)
	if err != nil && err != sql.ErrNoRows {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	res := map[string]interface{}{
		"count": count,
	}
	if key.Valid {
		res["key"] = key.String
	}
	json.NewEncoder(w).Encode(res)
}

func (h *handler) getKey(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Ymid string `json:"ymid"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Ymid == "" {
		http.Error(w, "ymid required", http.StatusBadRequest)
		return
	}

	// Return current status; key generation happens via Monetag postback
	var count int
	var key sql.NullString
	err := h.db.QueryRowContext(r.Context(),
		`SELECT ad_count, key_value FROM sessions WHERE ymid = $1`,
		req.Ymid,
	).Scan(&count, &key)
	if err != nil && err != sql.ErrNoRows {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	res := map[string]interface{}{"count": count}
	if key.Valid {
		res["key"] = key.String
	}
	json.NewEncoder(w).Encode(res)
}

func (h *handler) monetagPostback(w http.ResponseWriter, r *http.Request) {
	ymid := r.URL.Query().Get("ymid")
	event := r.URL.Query().Get("event")
	if ymid == "" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Only count click/impression
	if event != "click" && event != "impression" {
		w.WriteHeader(http.StatusOK)
		return
	}

	_, err := h.db.ExecContext(r.Context(),
		`INSERT INTO sessions (ymid, ad_count, updated_at)
		 VALUES ($1, 1, NOW())
		 ON CONFLICT (ymid) DO UPDATE SET
		   ad_count = LEAST(sessions.ad_count + 1, 10),
		   updated_at = NOW()`,
		ymid,
	)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	var count int
	h.db.QueryRowContext(r.Context(), `SELECT ad_count FROM sessions WHERE ymid = $1`, ymid).Scan(&count)

	if count >= 10 {
		keyStr, err := h.luarmor.addUser(r.Context(), 24)
		if err != nil {
			// Log but don't fail - will retry on next postback or manual check
			return
		}
		h.db.ExecContext(r.Context(),
			`UPDATE sessions SET key_value = $1, key_expires_at = NOW() + INTERVAL '24 hours',
			 ad_count = 0, updated_at = NOW() WHERE ymid = $2`,
			keyStr, ymid,
		)
	}

	w.WriteHeader(http.StatusOK)
}

func (h *handler) validateKey(w http.ResponseWriter, r *http.Request) {
	key := r.URL.Query().Get("key")
	if key == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{"valid": false})
		return
	}

	valid, err := h.luarmor.validateKey(r.Context(), key)
	if err != nil {
		// Fallback: check our DB
		var expiresAt sql.NullTime
		err := h.db.QueryRowContext(r.Context(),
			`SELECT key_expires_at FROM sessions WHERE key_value = $1`,
			key,
		).Scan(&expiresAt)
		if err == nil && expiresAt.Valid && expiresAt.Time.After(time.Now()) {
			valid = true
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"valid": valid})
}
