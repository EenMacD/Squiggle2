#!/bin/bash

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if Docker is installed and running
if ! command_exists docker; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker daemon is running
if ! docker info >/dev/null 2>&1; then
    echo "Error: Docker daemon is not running. Please start Docker first."
    exit 1
fi

# Kill any existing processes
echo "Cleaning up existing processes..."
pkill -f "go run cmd/server/main.go" || true
docker stop dynamodb-local || true
docker rm dynamodb-local || true

# Start DynamoDB Local
echo "Starting DynamoDB Local..."
if ! docker run -d -p 8000:8000 --name dynamodb-local amazon/dynamodb-local; then
    echo "Error: Failed to start DynamoDB Local. Please check Docker logs."
    exit 1
fi

# Wait for DynamoDB to be ready
echo "Waiting for DynamoDB to be ready..."
sleep 5

# Create the DynamoDB table
echo "Creating DynamoDB table..."
if ! go run scripts/setup_dynamodb.go; then
    echo "Error: Failed to create DynamoDB table."
    exit 1
fi

# Start the server
echo "Starting backend server..."
go run cmd/server/main.go 