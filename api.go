package main

import (
	"database/sql"
	"fmt"
	"html"
	"log"
	"regexp"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
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

			var username string = body.Username
			var password string = body.Password
			var email string = body.Email

			username = html.EscapeString(username)

			//Check if email is valid
			var matched bool
			matched, _ = regexp.MatchString(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`, email)
			if !matched {
				c.JSON(200, gin.H{"status": "error", "message": "email is invalid"})
				return
			}

			//Check if the username already exists
			var dbErr error
			var db *gorm.DB
			db, dbErr = connectDB()
			if dbErr != nil {
				c.JSON(200, gin.H{"status": "error", "message": "Error connecting to the database"})
				log.Print(dbErr.Error())
				return
			}

			var existingUser string

			var row *sql.Row = db.Raw(
				"SELECT username FROM users WHERE username = ? OR email = ? LIMIT 1",
				username,
				email,
			).Row()

			check := row.Scan(&existingUser)

			if check != sql.ErrNoRows {
				c.JSON(200, gin.H{"status": "error", "message": "An account with that username already exists!"})
				return
			}

			//Hash the password
			var bytes []byte
			var hashError error
			bytes, hashError = bcrypt.GenerateFromPassword([]byte(password), 14)
			if hashError != nil {
				c.JSON(200, gin.H{"status": "error", "message": "Error encrypting password :("})
				return
			}

			var passwordHash string = string(bytes)
			log.Print(passwordHash)

			db.Exec(
				"INSERT INTO users (username, password, email) VALUES (?, ?, ?)",
				username,
				passwordHash,
				email,
			)

			c.JSON(200, gin.H{"status": "success", "message": "Account created successfully!"})
		})
	}
}
