package main

import (
	"bytes"
	"crypto/rand"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	mathRand "math/rand/v2"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/wabarc/go-catbox"
	"gorm.io/gorm"
)

type User struct {
	ID             uint            `gorm:"primaryKey;autoIncrement" json:"id"`
	Username       string          `gorm:"size:255;not null" json:"username"`
	Password       string          `gorm:"size:255;not null" json:"-"`
	Email          string          `gorm:"size:255;not null" json:"email"`
	ProfilePicture string          `gorm:"size:255" json:"profile_picture"`
	BannedChannels json.RawMessage `gorm:"column:banned_channels"`
}

type Channel struct {
	ID         string          `gorm:"primaryKey;size:255" json:"id"`
	Name       string          `gorm:"size:255;not null" json:"name"`
	OwnerID    uint            `gorm:"not null" json:"owner_id"`
	Moderators json.RawMessage `gorm:"column:moderators"`
	CreatedAt  time.Time       `gorm:"autoCreateTime" json:"created_at"`
	Owner      User            `gorm:"foreignKey:OwnerID" json:"owner,omitempty"`
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

func checkTurnstile(token string) (bool, string) {
	var payload map[string]string = map[string]string{
		"secret":   turnstileSecretKey,
		"response": token,
	}
	jsonData, _ := json.Marshal(payload)
	resp, err := http.Post("https://challenges.cloudflare.com/turnstile/v0/siteverify", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return false, err.Error()
	}
	defer resp.Body.Close()

	return true, ""
}

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
		profilePicture = fmt.Sprintf("/assets/images/profile%d.png", mathRand.IntN(4)+1)
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

// uploadFileToCatbox handles file upload validation and uploads to Catbox
// Returns the uploaded file URL and any error encountered
func uploadFileToCatbox(c *gin.Context, formFieldName string, maxSizeBytes int64, allowedTypes []string) (string, error) {
	file, err := c.FormFile(formFieldName)
	if err != nil {
		return "", errors.New("no file uploaded")
	}

	if file.Size > maxSizeBytes {
		return "", errors.New("file size exceeds limit")
	}

	contentType := file.Header.Get("Content-Type")
	isAllowed := false
	for _, allowedType := range allowedTypes {
		if contentType == allowedType {
			isAllowed = true
			break
		}
	}
	if !isAllowed {
		return "", errors.New("file type not allowed")
	}

	src, err := file.Open()
	if err != nil {
		return "", errors.New("failed to open uploaded file")
	}
	defer src.Close()

	ext := filepath.Ext(file.Filename)
	if ext == "" {
		ext = ".jpg"
	}

	tempFile, err := os.CreateTemp("", "upload-*"+ext)
	if err != nil {
		return "", errors.New("failed to create temp file")
	}
	tempPath := tempFile.Name()
	defer os.Remove(tempPath)

	_, err = tempFile.ReadFrom(src)
	tempFile.Close()
	if err != nil {
		return "", errors.New("failed to save uploaded file")
	}

	url, err := catbox.New(nil).Upload(tempPath)
	if err != nil {
		return "", errors.New("failed to upload to Catbox")
	}

	return url, nil
}
