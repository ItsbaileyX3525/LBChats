package main

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

/* deprecated */

func createAuth(router *gin.Engine, db *gorm.DB) {
	auth := router.Group("/auth")
	auth.Use(sessionMiddleware(db))
	{
		auth.GET("/AccountInfo", func(c *gin.Context) {
			userID := c.GetInt("userID")
			c.JSON(200, gin.H{"userID": userID})
		})
	}
}
