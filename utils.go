package main

import (
	"crypto/rand"
	"encoding/binary"
	"encoding/hex"
	"errors"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type User struct {
	ID             uint   `gorm:"primaryKey;autoIncrement" json:"id"`
	Username       string `gorm:"size:255;not null" json:"username"`
	Password       string `gorm:"size:255;not null" json:"-"`
	Email          string `gorm:"size:255;not null" json:"email"`
	ProfilePicture string `gorm:"size:255" json:"profile_picture"`
}

type Channel struct {
	ID        string    `gorm:"primaryKey;size:255" json:"id"`
	Name      string    `gorm:"size:255;not null" json:"name"`
	OwnerID   uint      `gorm:"not null" json:"owner_id"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	Owner     User      `gorm:"foreignKey:OwnerID" json:"owner,omitempty"`
}

type Message struct {
	ID             uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID         uint      `gorm:"not null" json:"user_id"`
	Username       string    `gorm:"not null" json:"username"`
	ChannelID      string    `gorm:"not null" json:"channel_id"`
	Content        string    `gorm:"size:1000;not null" json:"content"`
	ProfilePicture string    `gorm:"size:255" json:"profile_picture"`
	CreatedAt      time.Time `gorm:"autoCreateTime" json:"created_at"`
	User           User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Channel        Channel   `gorm:"foreignKey:ChannelID" json:"channel,omitempty"`
}

type Session struct {
	ID             string    `gorm:"primaryKey;size:64" json:"id"`
	UserID         uint      `gorm:"column:user_id;not null" json:"user_id"`
	Email          string    `gorm:"size:255;not null" json:"email"`
	Username       string    `gorm:"size:255;not null" json:"username"`
	ProfilePicture string    `gorm:"size:255" json:"profile_picture"`
	ExpiresAt      time.Time `gorm:"column:expires_at;not null" json:"expires_at"`
	User           User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

type UserChannel struct {
	UserID    uint      `gorm:"primaryKey;not null" json:"user_id"`
	ChannelID string    `gorm:"primaryKey;size:255;not null" json:"channel_id"`
	JoinedAt  time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"joined_at"`
	User      User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Channel   Channel   `gorm:"foreignKey:ChannelID" json:"channel,omitempty"`
}

type InviteCode struct {
	ID         uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	ChannelID  string    `gorm:"size:255;not null" json:"channel_id"`
	InviteCode string    `gorm:"size:255;not null;uniqueIndex" json:"invite_code"`
	CreatedAt  time.Time `gorm:"autoCreateTime" json:"created_at"`
	Channel    Channel   `gorm:"foreignKey:ChannelID" json:"channel,omitempty"`
}

const base62Alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

func serveHTML(router *gin.Engine) {
	router.NoRoute(func(c *gin.Context) {
		if c.Request.Method == "GET" {
			var path string = filepath.Join("./public", c.Request.URL.Path)
			var info os.FileInfo
			var pathError error
			if info, pathError = os.Stat(path); pathError == nil && !info.IsDir() {
				c.File(path)
				return
			}

			if filepath.Ext(path) == "" {
				var htmlPath string = path + ".html"
				var htmlError error
				if _, htmlError = os.Stat(htmlPath); htmlError == nil {
					c.File(htmlPath)
					return
				}
			}

			if info, err := os.Stat(path); err == nil && info.IsDir() {
				var indexPath string = filepath.Join(path, "index.html")
				var indexPathError error
				if _, indexPathError = os.Stat(indexPath); indexPathError == nil {
					c.File(indexPath)
					return
				}
			}

			c.File("./public/404.html")
		}
	})
}

func createSession(db *gorm.DB, userID uint, username string, email string) (string, error) {
	var tokenBytes []byte = make([]byte, 32)
	var err error
	_, err = rand.Read(tokenBytes)
	if err != nil {
		return "", err
	}
	var token string = hex.EncodeToString(tokenBytes)

	var profilePicture string
	db.Raw("SELECT profile_picture FROM users WHERE id = ?", userID).Scan(&profilePicture)
	if profilePicture == "" {
		profilePicture = "/assets/images/profile.png"
	}

	session := Session{
		ID:             token,
		UserID:         userID,
		Username:       username,
		Email:          email,
		ProfilePicture: profilePicture,
		ExpiresAt:      time.Now().Add(24 * time.Hour),
	}

	if err = db.Create(&session).Error; err != nil {
		return "", err
	}

	return token, nil
}

func validateCookie(db *gorm.DB, c *gin.Context) (*Session, error) {
	var cookie string
	var err error
	cookie, err = c.Cookie("session_id")

	var session Session
	err = db.First(&session, "id = ?", cookie).Error
	if err != nil {
		return nil, err
	}

	if time.Now().After(session.ExpiresAt) {
		db.Delete(&session)
		return nil, errors.New("Session expired")
	}

	return &session, nil
}

func sessionMiddleware(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var session *Session
		var err error
		session, err = validateCookie(db, c)
		if err != nil {
			c.AbortWithStatusJSON(401, gin.H{"status": "error", "message": "unauthorised"})
			return
		}

		c.Set("userID", session.UserID)
		c.Set("email", session.Email)
		c.Set("username", session.Username)
		c.Set("profile_picture", session.ProfilePicture)

		c.Next()
	}
}

func base62Encode(n uint32) string {
	if n == 0 {
		return string(base62Alphabet[0])
	}

	out := make([]byte, 0, 6)
	for n > 0 {
		r := n % 62
		out = append([]byte{base62Alphabet[r]}, out...)
		n /= 62
	}
	return string(out)
}

func createInviteLink() string {
	var b [4]byte
	var err error
	_, err = rand.Read(b[:])
	if err != nil {
		panic(err)
	}

	var randomInt uint32 = binary.BigEndian.Uint32(b[:])

	var uniqueID string = base62Encode(randomInt)

	return uniqueID

}
