package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"gorm.io/gorm"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type Client struct {
	conn        *websocket.Conn
	userID      uint
	username    string
	profilePath string
	channelID   string
	send        chan []byte
}

type BroadcastMessage struct {
	channelID string
	data      []byte
}

type KickMessage struct {
	userID    uint
	channelID string
	data      []byte
}

type Hub struct {
	clients    map[*Client]bool
	broadcast  chan BroadcastMessage
	kick       chan KickMessage
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

func newHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan BroadcastMessage),
		kick:       make(chan KickMessage),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				if client.channelID == message.channelID {
					select {
					case client.send <- message.data:
					default:
						close(client.send)
						delete(h.clients, client)
					}
				}
			}
			h.mu.RUnlock()

		case kick := <-h.kick:
			h.mu.RLock()
			for client := range h.clients {
				if client.userID == kick.userID {
					select {
					case client.send <- kick.data:
					default:
						close(client.send)
						delete(h.clients, client)
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

var hub = newHub()

func createWebsockets(router *gin.Engine, db *gorm.DB) {
	go hub.run()

	router.GET("/ws", func(c *gin.Context) {
		session, err := validateCookie(db, c)
		if err != nil {
			c.JSON(401, gin.H{"status": "error", "message": "unauthorized"})
			return
		}

		channelID := c.Query("channel_id")
		if channelID == "" {
			channelID = "public"
		}

		var inChannel uint
		db.Raw(
			"SELECT user_id FROM user_channels WHERE user_id = ? AND channel_id = ?",
			session.UserID,
			channelID,
		).Scan(&inChannel)

		if inChannel == 0 {
			c.JSON(403, gin.H{"status": "error", "message": "not in channel"})
			return
		}

		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Printf("WebSocket upgrade error: %v", err)
			return
		}

		client := &Client{
			conn:        conn,
			userID:      session.UserID,
			username:    session.Username,
			profilePath: session.ProfilePicture,
			channelID:   channelID,
			send:        make(chan []byte, 256),
		}

		hub.register <- client

		go client.writePump(db)
		go client.readPump(db)
	})
}

func (c *Client) readPump(db *gorm.DB) {
	defer func() {
		hub.unregister <- c
		c.conn.Close()
	}()

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		var msgData struct {
			Type           string `json:"type"`
			Content        string `json:"content"`
			ChannelID      string `json:"channel_id"`
			SoundURL       string `json:"sound_url"`
			ProfilePicture string `json:"profile_path"`
		}

		if err := json.Unmarshal(message, &msgData); err != nil {
			log.Printf("Error parsing message: %v", err)
			continue
		}

		if msgData.ChannelID != c.channelID {
			log.Printf("Channel mismatch: client on %s, message for %s", c.channelID, msgData.ChannelID)
			continue
		}

		var inChannel uint
		db.Raw(
			"SELECT user_id FROM user_channels WHERE user_id = ? AND channel_id = ?",
			c.userID,
			c.channelID,
		).Scan(&inChannel)

		if inChannel == 0 {
			log.Printf("User %d no longer in channel %s", c.userID, c.channelID)
			continue
		}

		if msgData.Type == "message" && msgData.Content != "" {
			msg := Message{
				UserID:         c.userID,
				Username:       c.username,
				ProfilePicture: c.profilePath,
				ChannelID:      msgData.ChannelID,
				Content:        msgData.Content,
			}

			if err := db.Create(&msg).Error; err != nil {
				log.Printf("Error saving message: %v", err)
				continue
			}

			broadcastData, _ := json.Marshal(map[string]interface{}{
				"type":         "message",
				"id":           msg.ID,
				"user_id":      msg.UserID,
				"username":     msg.Username,
				"content":      msg.Content,
				"channel_id":   msg.ChannelID,
				"created_at":   msg.CreatedAt,
				"profile_path": msg.ProfilePicture,
			})

			hub.broadcast <- BroadcastMessage{
				channelID: msgData.ChannelID,
				data:      broadcastData,
			}
		} else if msgData.Type == "sound" && msgData.SoundURL != "" {
			broadcastData, _ := json.Marshal(map[string]interface{}{
				"type":      "sound",
				"sound_url": msgData.SoundURL,
				"username":  c.username,
			})

			hub.broadcast <- BroadcastMessage{
				channelID: msgData.ChannelID,
				data:      broadcastData,
			}
		}
	}
}

func (c *Client) writePump(db *gorm.DB) {
	defer c.conn.Close()

	for message := range c.send {
		if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
			return
		}
	}
	c.conn.WriteMessage(websocket.CloseMessage, []byte{})
}
