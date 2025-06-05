package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

type PlayHandler struct {
	client *dynamodb.Client
}

func NewPlayHandler(client *dynamodb.Client) *PlayHandler {
	return &PlayHandler{client: client}
}

type Position struct {
	X float64 `json:"x" dynamodbav:"x"`
	Y float64 `json:"y" dynamodbav:"y"`
}

type BallState struct {
	Position   Position `json:"position" dynamodbav:"position"`
	AttachedTo *struct {
		Type string `json:"type" dynamodbav:"type"`
		ID   int    `json:"id" dynamodbav:"id"`
	} `json:"attachedTo" dynamodbav:"attachedTo"`
}

type PlayerState struct {
	PlayerID  string     `json:"playerId" dynamodbav:"playerId"`
	Position  Position   `json:"position" dynamodbav:"position"`
	Timestamp int64      `json:"timestamp" dynamodbav:"timestamp"`
	BallState *BallState `json:"ballState,omitempty" dynamodbav:"ballState,omitempty"`
}

type Play struct {
	ID           string        `json:"id" dynamodbav:"id"`
	Name         string        `json:"name" dynamodbav:"name"`
	CreatedAt    string        `json:"createdAt" dynamodbav:"createdAt"`
	PlayerStates []PlayerState `json:"playerStates" dynamodbav:"playerStates"`
}

type CreatePlayRequest struct {
	Name         string        `json:"name"`
	PlayerStates []PlayerState `json:"playerStates"`
}

func (h *PlayHandler) CreatePlay(w http.ResponseWriter, r *http.Request) {
	var req CreatePlayRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error decoding request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	play := Play{
		ID:           uuid.New().String(),
		Name:         req.Name,
		CreatedAt:    time.Now().UTC().Format(time.RFC3339),
		PlayerStates: req.PlayerStates,
	}

	log.Printf("Creating play: %+v", play)

	item, err := attributevalue.MarshalMap(play)
	if err != nil {
		log.Printf("Error marshaling play: %v", err)
		http.Error(w, "Failed to marshal play", http.StatusInternalServerError)
		return
	}

	_, err = h.client.PutItem(r.Context(), &dynamodb.PutItemInput{
		TableName: aws.String("Plays"),
		Item:      item,
	})
	if err != nil {
		log.Printf("Error creating play in DynamoDB: %v", err)
		log.Printf("Error type: %T", err)
		log.Printf("Request item: %+v", item)
		http.Error(w, "Failed to create play", http.StatusInternalServerError)
		return
	}

	log.Printf("Successfully created play with ID: %s", play.ID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(play)
}

func (h *PlayHandler) ListPlays(w http.ResponseWriter, r *http.Request) {
	result, err := h.client.Scan(r.Context(), &dynamodb.ScanInput{
		TableName: aws.String("Plays"),
	})
	if err != nil {
		log.Printf("Error scanning plays: %v", err)
		http.Error(w, "Failed to fetch plays", http.StatusInternalServerError)
		return
	}

	var plays []Play
	if err := attributevalue.UnmarshalListOfMaps(result.Items, &plays); err != nil {
		log.Printf("Error unmarshaling plays: %v", err)
		http.Error(w, "Failed to unmarshal plays", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(plays)
}

func (h *PlayHandler) GetPlay(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	result, err := h.client.GetItem(r.Context(), &dynamodb.GetItemInput{
		TableName: aws.String("Plays"),
		Key: map[string]types.AttributeValue{
			"id": &types.AttributeValueMemberS{Value: id},
		},
	})
	if err != nil {
		log.Printf("Error getting play: %v", err)
		http.Error(w, "Failed to fetch play", http.StatusInternalServerError)
		return
	}

	if result.Item == nil {
		http.Error(w, "Play not found", http.StatusNotFound)
		return
	}

	var play Play
	if err := attributevalue.UnmarshalMap(result.Item, &play); err != nil {
		log.Printf("Error unmarshaling play: %v", err)
		http.Error(w, "Failed to unmarshal play", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(play)
}

func (h *PlayHandler) DeletePlay(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	_, err := h.client.DeleteItem(r.Context(), &dynamodb.DeleteItemInput{
		TableName: aws.String("Plays"),
		Key: map[string]types.AttributeValue{
			"id": &types.AttributeValueMemberS{Value: id},
		},
	})
	if err != nil {
		log.Printf("Error deleting play: %v", err)
		http.Error(w, "Failed to delete play", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
