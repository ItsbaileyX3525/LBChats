package main

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Session struct {
	ID        string `gorm:"primaryKey"`
	UserID    uint
	Email     string
	Username  string
	ExpiresAt time.Time
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

	session := Session{
		ID:        token,
		UserID:    userID,
		Username:  username,
		Email:     email,
		ExpiresAt: time.Now().Add(24 * time.Hour),
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
		}

		c.Set("userID", session.UserID)
		c.Set("email", session.Email)
		c.Set("username", session.Username)

		c.Next()
	}
}
