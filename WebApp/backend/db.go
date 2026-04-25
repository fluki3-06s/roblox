package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func initDB() (*sql.DB, error) {
	connStr := getSupabaseConnStr()
	if connStr == "" {
		return nil, fmt.Errorf("SUPABASE_URL or DATABASE_URL not set")
	}

	db, err := sql.Open("pgx", connStr)
	if err != nil {
		return nil, err
	}

	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(30 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		return nil, err
	}

	if err := migrateDB(db); err != nil {
		log.Printf("Migration warning: %v", err)
	}

	return db, nil
}

func getSupabaseConnStr() string {
	// Supabase: Settings -> Database -> Connection string (URI)
	return os.Getenv("DATABASE_URL")
}

func migrateDB(db *sql.DB) error {
	q := `
	CREATE TABLE IF NOT EXISTS sessions (
		ymid VARCHAR(255) PRIMARY KEY,
		ad_count INTEGER NOT NULL DEFAULT 0,
		key_value TEXT,
		key_expires_at TIMESTAMPTZ,
		created_at TIMESTAMPTZ DEFAULT NOW(),
		updated_at TIMESTAMPTZ DEFAULT NOW()
	);

	CREATE INDEX IF NOT EXISTS idx_sessions_key ON sessions(key_value) WHERE key_value IS NOT NULL;
	`
	_, err := db.Exec(q)
	return err
}
