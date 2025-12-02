package main

import (
	"crypto/rand"
	"encoding/hex"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

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

type Session struct {
	ID        string `gorm:"primaryKey"`
	UserID    uint
	ExpiresAt time.Time
}

func createSession(db *gorm.DB, userID uint) (string, error) {
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
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}

	if err = db.Create(&session).Error; err != nil {
		return "", err
	}

	return token, nil
}
