package models

import (
	"time"
)

// Position represents a player's position at a specific time
type Position struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// BallState represents the ball's state at a specific time
type BallState struct {
	Position   Position `json:"position"`
	AttachedTo *struct {
		Type string `json:"type"`
		ID   int    `json:"id"`
	} `json:"attachedTo"`
}

// PlayerState represents a player's state at a specific time
type PlayerState struct {
	PlayerID  string     `json:"playerId"`
	Position  Position   `json:"position"`
	Timestamp int64      `json:"timestamp"`
	BallState *BallState `json:"ballState,omitempty"`
}

// Play represents a recorded play
type Play struct {
	ID           string        `json:"id"`
	Name         string        `json:"name"`
	CreatedAt    time.Time     `json:"createdAt"`
	PlayerStates []PlayerState `json:"playerStates"`
}

// CreatePlayRequest represents the request to create a new play
type CreatePlayRequest struct {
	Name         string        `json:"name"`
	PlayerStates []PlayerState `json:"playerStates"`
}
