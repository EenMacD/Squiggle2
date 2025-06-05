package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"squiggle-backend/internal/handlers"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables from .env file
	err := godotenv.Load()
	if err != nil {
		log.Printf("Warning: Error loading .env file: %v", err)
	} else {
		log.Println("Successfully loaded .env file")
	}

	// Log environment variables (excluding sensitive ones)
	log.Printf("AWS_REGION: %s", os.Getenv("AWS_REGION"))
	log.Printf("DYNAMODB_ENDPOINT: %s", os.Getenv("DYNAMODB_ENDPOINT"))

	// Create AWS config with dummy credentials for local development
	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion("us-east-1"),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider("dummy", "dummy", "")),
		config.WithEndpointResolverWithOptions(aws.EndpointResolverWithOptionsFunc(
			func(service, region string, options ...interface{}) (aws.Endpoint, error) {
				log.Printf("Configuring endpoint for service: %s, region: %s", service, region)
				return aws.Endpoint{
					URL: "http://localhost:8000",
				}, nil
			},
		)),
	)
	if err != nil {
		log.Fatalf("Unable to load SDK config: %v", err)
	}

	// Create DynamoDB client
	client := dynamodb.NewFromConfig(cfg)

	// Verify DynamoDB connection
	_, err = client.ListTables(context.TODO(), &dynamodb.ListTablesInput{})
	if err != nil {
		log.Printf("Failed to connect to DynamoDB: %v", err)
		log.Printf("Error type: %T", err)
		log.Fatalf("Failed to connect to DynamoDB: %v", err)
	}
	log.Println("Successfully connected to DynamoDB")

	// Create router
	r := mux.NewRouter()

	// Add CORS middleware
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Allow requests from the frontend
			w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.Header().Set("Access-Control-Allow-Credentials", "true")

			// Handle preflight requests
			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	})

	// Create API router with /api prefix
	api := r.PathPrefix("/api").Subrouter()

	// Initialize handlers
	playHandler := handlers.NewPlayHandler(client)

	// Register routes
	api.HandleFunc("/plays", playHandler.CreatePlay).Methods("POST", "OPTIONS")
	api.HandleFunc("/plays", playHandler.ListPlays).Methods("GET", "OPTIONS")
	api.HandleFunc("/plays/{id}", playHandler.GetPlay).Methods("GET", "OPTIONS")
	api.HandleFunc("/plays/{id}", playHandler.DeletePlay).Methods("DELETE", "OPTIONS")

	// Add health check endpoint
	api.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	}).Methods("GET")

	// Create server
	srv := &http.Server{
		Addr:    ":8080",
		Handler: r,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("Server starting on :8080")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	// Create shutdown context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Attempt graceful shutdown
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exiting")
}
