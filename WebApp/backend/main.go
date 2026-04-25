package main

import (
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	db, err := initDB()
	if err != nil {
		log.Fatalf("DB init: %v", err)
	}
	defer db.Close()

	h := newHandler(db)
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Content-Type"},
		AllowCredentials: false,
	}))

	r.Get("/health", h.health)

	r.Route("/api", func(r chi.Router) {
		r.Get("/session/{ymid}/count", h.getSessionCount)
		r.Post("/get-key", h.getKey)
		r.Get("/postback", h.monetagPostback)
		r.Get("/validate", h.validateKey)
	})

	log.Printf("Server listening on :%s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Server: %v", err)
	}
}
