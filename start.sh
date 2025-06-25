#!/bin/bash

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        return 0
    else
        return 1
    fi
}

# Function to wait for a port to be available
wait_for_port() {
    local port=$1
    local timeout=30
    local start_time=$(date +%s)
    
    echo "Waiting for port $port to be available..."
    while check_port $port; do
        if [ $(($(date +%s) - start_time)) -gt $timeout ]; then
            echo "Timeout waiting for port $port"
            exit 1
        fi
        sleep 1
    done
}

# Function to start Docker daemon on macOS
start_docker_daemon() {
    if command_exists colima; then
        echo "Starting Docker via Colima..."
        if ! colima status >/dev/null 2>&1; then
            echo "Starting Colima..."
            colima start
        else
            echo "Colima is already running"
        fi
        
        # Wait for Docker daemon to be ready
        echo "Waiting for Docker daemon to be ready..."
        local timeout=60
        local start_time=$(date +%s)
        
        while ! docker info >/dev/null 2>&1; do
            if [ $(($(date +%s) - start_time)) -gt $timeout ]; then
                echo "Timeout waiting for Docker daemon to start"
                echo "Try running: colima restart"
                exit 1
            fi
            echo "Docker daemon not ready yet, waiting..."
            sleep 2
        done
        echo "Docker daemon is ready!"
    else
        echo "No Docker runtime found. Please install Colima:"
        echo "  brew install colima"
        exit 1
    fi
}

echo "Starting Docker daemon..."
start_docker_daemon

# Check if Docker is installed and running
if ! command_exists docker; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

if ! docker info >/dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker first."
    exit 1
fi

# Kill any existing processes on the ports we need
echo "Cleaning up existing processes..."
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:8080 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

# Remove existing DynamoDB container if it exists
echo "Removing existing DynamoDB container..."
docker rm -f dynamodb-local 2>/dev/null

# Start DynamoDB Local
echo "Starting DynamoDB Local..."
docker run -d -p 8000:8000 --name dynamodb-local amazon/dynamodb-local
if [ $? -ne 0 ]; then
    echo "Error: Failed to start DynamoDB Local. Please check Docker logs."
    exit 1
fi

# Wait for DynamoDB to be ready
echo "Waiting for DynamoDB to be ready..."
sleep 5

# Setup DynamoDB table
echo "Setting up DynamoDB table..."
cd squiggle-backend
go run scripts/setup_dynamodb.go
if [ $? -ne 0 ]; then
    echo "Error: Failed to setup DynamoDB table. Please check the logs above."
    exit 1
fi
cd ..

# Start backend server with logging
echo "Starting backend server..."
cd squiggle-backend
go run cmd/server/main.go > backend.log 2>&1 &
BACKEND_PID=$!
wait_for_port 8080
cd ..

# Start frontend
echo "Starting frontend..."
cd squiggle-ui
npm run dev &
wait_for_port 5173
cd ..

echo "All services are running!"
echo "Frontend: http://localhost:5173"
echo "Backend: http://localhost:8080"
echo "DynamoDB Local: http://localhost:8000"
echo "Backend logs are being written to backend.log"

# Function to show backend logs
show_logs() {
    echo "Showing backend logs (Ctrl+C to stop):"
    tail -f squiggle-backend/backend.log
}

# Keep the script running and handle cleanup on exit
trap 'echo "Shutting down services..."; docker stop dynamodb-local; docker rm dynamodb-local; kill $BACKEND_PID; pkill -f "npm run dev"' EXIT

# Show backend logs
show_logs 