# Squiggle Backend

This is the backend service for the Squiggle application, providing API endpoints for recording and playing back plays.

## Prerequisites

- Go 1.24 or later
- DynamoDB Local
- Java 17 or later (required for DynamoDB Local)

## Setup

1. Start DynamoDB Local:
```bash
dynamodb-local
```

2. Create the DynamoDB table:
```bash
go run scripts/setup_dynamodb.go
```

3. Run the server:
```bash
go run cmd/server/main.go
```

The server will start on port 8080 by default. You can change this by setting the `PORT` environment variable.

## API Endpoints

### Plays

- `POST /api/plays` - Create a new play
- `GET /api/plays` - List all plays
- `GET /api/plays/:id` - Get a specific play
- `DELETE /api/plays/:id` - Delete a play

## Development

The project structure is organized as follows:

- `cmd/server/` - Main server application
- `internal/` - Internal packages
  - `handlers/` - HTTP request handlers
  - `models/` - Data models
- `scripts/` - Utility scripts

## Testing

To run the tests:
```bash
go test ./...
``` 