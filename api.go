package main

import (
	"fmt"
	"log"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func connectDB() (*gorm.DB, error) {
	var dsn string = fmt.Sprintf("%s:%s@tcp(localhost:3306)/%s?charset=utf8mb4&parseTime=True&loc=UTC", dbUser, dbPass, dbName)
	var db *gorm.DB
	var err error
	db, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}
	return db, nil
}

func serveEndpoints(router *gin.Engine) {
	var api = router.Group("api")
	{
		api.GET("test", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "success", "message": "endpoint working probs"})
		})

		//Account creation stuff

		api.POST("createAccount", func(c *gin.Context) {
			type bodyData struct {
				Username string `json:"username"`
				Password string `json:"password"`
				Email    string `json:"email"`
			}

			var body bodyData

			c.ShouldBindBodyWithJSON(&body)

			log.Printf("username: %s", body.Username)
		})
	}
}
