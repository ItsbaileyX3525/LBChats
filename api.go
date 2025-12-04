package main

import (
	"database/sql"
	"fmt"
	"html"
	"log"
	"regexp"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
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

func serveEndpoints(router *gin.Engine, db *gorm.DB) {
	var api = router.Group("api")
	{
		api.GET("test", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "success", "message": "endpoint working probs"})
		})

		//TODO: Add turnstile stuff to the account create/login methods

		api.POST("validateCookie", func(c *gin.Context) {
			var session *Session
			var err error
			session, err = validateCookie(db, c)
			if err != nil {
				c.JSON(200, gin.H{"status": "error", "message": "Unauthorised"})
				return
			}

			c.JSON(200, gin.H{"status": "success", "message": "Valid session", "userID": session.UserID, "username": session.Username})
		})

		api.POST("logout", func(c *gin.Context) {
			var cookie string
			var err error
			cookie, err = c.Cookie("session_id")

			var db *gorm.DB
			var dbErr error
			db, dbErr = connectDB()
			if dbErr != nil {
				c.JSON(200, gin.H{"status": "error", "message": "Error connecting to the database"})
				return
			}

			if err != nil {
				db.Delete(&Session{}, "id = ?", cookie)
			}

			c.SetCookie(
				"session_id",
				"",
				-1,
				"/",
				"",
				false,
				true,
			)

			c.JSON(200, gin.H{"status": "success", "message": "logged out successfully."})
		})

		api.POST("login", func(c *gin.Context) {
			type bodyData struct {
				Username string `json:"username"`
				Password string `json:"password"`
			}

			var body bodyData

			c.ShouldBindBodyWithJSON(&body)

			var username = body.Username
			var password = body.Password
			var err error

			username = html.EscapeString(username)

			var db *gorm.DB
			var dbErr error
			db, dbErr = connectDB()
			if dbErr != nil {
				c.JSON(200, gin.H{"status": "error", "message": "Error connecting to the database"})
				return
			}

			var passwordHash string

			var passwordRead *sql.Row = db.Raw(
				"SELECT password FROM users WHERE username = ?",
				username,
			).Row()

			err = passwordRead.Scan(&passwordHash)
			if err == sql.ErrNoRows { //No username with account
				c.JSON(200, gin.H{"status": "error", "message": "No account found"})
				return
			}
			if err != sql.ErrNoRows && err != nil {
				c.JSON(200, gin.H{"status": "error", "message": "Error reading database"})
				return
			}

			err = bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(password))
			if err == bcrypt.ErrMismatchedHashAndPassword {
				c.JSON(200, gin.H{"status": "error", "message": "Incorrect password"})
				return
			}
			if err != bcrypt.ErrMismatchedHashAndPassword && err != nil {
				c.JSON(200, gin.H{"status": "error", "message": "Error comparing password hashes", "error": err.Error()})
				return
			}

			var userID uint

			var userIDFetch *sql.Row = db.Raw(
				"SELECT id FROM users WHERE username = ?",
				username,
			).Row()

			err = userIDFetch.Scan(&userID)
			if err != nil {
				c.JSON(200, gin.H{"status": "error", "message": "idek how this happened."})
				return
			}

			var email string

			var emailFetch *sql.Row = db.Raw(
				"SELECT email FROM users WHERE username = ?",
				username,
			).Row()

			err = emailFetch.Scan(&email)
			if err != nil {
				c.JSON(200, gin.H{"status": "error", "message": "idek how this happened."})
				return
			}

			var sessionID string
			sessionID, err = createSession(db, userID, username, email)
			if err != nil {
				c.JSON(200, gin.H{"status": "error", "message": "error creating a session"})
				return
			}

			c.SetCookie(
				"session_id",
				sessionID,
				86400,
				"/",
				"",
				false,
				true,
			)

			c.JSON(200, gin.H{"status": "success", "message": "Logged in successfully!"})
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

			if len(password) < 8 {
				c.JSON(200, gin.H{"status": "error", "message": "Password must be atleast 8 chars long!"})
				return
			}

			matched, _ = regexp.MatchString(`\d`, password)
			if !matched {
				c.JSON(200, gin.H{"status": "error", "message": "Password must contain atleast 1 number!"})
				return
			}

			if len(username) < 4 {
				c.JSON(200, gin.H{"status": "error", "message": "username must be atleast 4 chars long!"})
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

			var userID uint

			var userIDFetch *sql.Row = db.Raw(
				"SELECT id FROM users WHERE username = ?",
				username,
			).Row()

			check = userIDFetch.Scan(&userID)
			if check != nil {
				c.JSON(200, gin.H{"status": "error", "message": "idek how this happened."})
				return
			}

			var sessionID string
			sessionID, check = createSession(db, userID, username, email)
			if check != nil {
				c.JSON(200, gin.H{"status": "error", "message": "error creating a session"})
				return
			}

			c.SetCookie(
				"session_id",
				sessionID,
				86400,
				"/",
				"",
				false,
				true,
			)

			c.JSON(200, gin.H{"status": "success", "message": "Account created successfully!"})
		})
	}

	var protectedApi = router.Group("api")
	protectedApi.Use(sessionMiddleware(db))
	{
		protectedApi.POST("userChannels", func(c *gin.Context) {
			type channelsStruct struct {
				channelID uint
			}

			var channels []channelsStruct

			var dbErr error
			var db *gorm.DB
			db, dbErr = connectDB()
			if dbErr != nil {
				c.JSON(200, gin.H{"status": "error", "message": "Error connecting to the database"})
				log.Print(dbErr.Error())
				return
			}

			var err error
			var userID uint = c.GetUint("userID")

			err = db.Raw(
				"SELECT * FROM user_channels WHERE user_id = ?",
				userID,
			).Scan(&channels).Error

			if err != nil {
				c.JSON(200, gin.H{"status": "error", "message": "Error finding data on this user."})
				return
			}

			log.Print(channels)
		})

		protectedApi.POST("getMessages", func(c *gin.Context) {
			type bodyData struct {
				ChannelID string `json:"channel_id"`
				OnPage    uint   `json:"on_page"`
			}

			type Messages struct {
				UserID  uint   `gorm:"column:user_id"`
				Content string `gorm:"column:content"`
			}

			var body bodyData
			var err error
			err = c.ShouldBindBodyWithJSON(&body)
			if err != nil {
				c.JSON(200, gin.H{"status": "error", "message": "invalid post data"})
				return
			}

			var channelID string = body.ChannelID
			var onPage uint = body.OnPage
			var offset uint = onPage * 16

			var messages []Messages

			var dbErr error
			var db *gorm.DB
			db, dbErr = connectDB()
			if dbErr != nil {
				c.JSON(200, gin.H{"status": "error", "message": "Error connecting to the database"})
				log.Print(dbErr.Error())
				return
			}

			err = db.Raw(
				"SELECT user_id, content FROM messages WHERE channel_id = ? LIMIT 16 OFFSET ?",
				channelID,
				offset,
			).Scan(&messages).Error
			if err != nil {
				c.JSON(500, gin.H{"status": "error", "message": "Server error"})
				return
			}

			if len(messages) == 0 {
				c.JSON(200, gin.H{"status": "success", "messages": []Messages{}})
				return
			}

			c.JSON(200, gin.H{"status": "success", "messages": messages})

		})

		protectedApi.POST("createLink", func(c *gin.Context) {
			type bodyData struct {
				ChannelName string `json:"channel_name"`
			}

			var body bodyData
			var err error
			err = c.ShouldBindBodyWithJSON(&body)
			if err != nil {
				c.JSON(200, gin.H{"status": "error", "message": "invalid post data"})
				return
			}

			var channelName = body.ChannelName
			var inviteLink string = createInviteLink()
			var channelID string

			var dbErr error
			var db *gorm.DB
			db, dbErr = connectDB()
			if dbErr != nil {
				c.JSON(200, gin.H{"status": "error", "message": "Error connecting to the database"})
				log.Print(dbErr.Error())
				return
			}

			err = db.Raw(
				"SELECT id FROM channels WHERE name = ?",
				channelName,
			).Scan(&channelID).Error

			if err != nil {
				c.JSON(200, gin.H{"status": "error", "message": "Channel doesn't exist"})
				return
			}

			db.Exec(
				"INSERT INTO invite_codes (channel_id, invite_code) VALUES (?, ?)",
				channelID,
				inviteLink,
			)

			c.JSON(200, gin.H{"status": "success", "message": "invite link created successfully!", "invite_link": inviteLink})
		})

		protectedApi.POST("createChannel", func(c *gin.Context) {
			type bodyData struct {
				ChannelName string `json:"channel_name"`
			}

			var body bodyData
			var err error

			if err = c.ShouldBindBodyWithJSON(&body); err != nil {
				c.JSON(200, gin.H{"status": "error", "message": "Invalid post data"})
				return
			}

			var channelName string = body.ChannelName

			var dbErr error
			var db *gorm.DB
			db, dbErr = connectDB()
			if dbErr != nil {
				c.JSON(200, gin.H{"status": "error", "message": "Error connecting to the database"})
				log.Print(dbErr.Error())
				return
			}

			var channelUuid uuid.UUID = uuid.New()

			db.Exec(
				"INSERT INTO channels (id, name, owner_id) VALUES (?, ?, ?)",
				channelUuid,
				channelName,
				c.GetUint("userID"),
			)

			c.JSON(200, gin.H{"status": "success", "message": "Channel created successfully!"})
		})

		protectedApi.POST("joinChannel", func(c *gin.Context) {
			type bodyData struct {
				InviteLink string `json:"invite_link"`
			}

			var body bodyData
			var err error
			if err = c.ShouldBindBodyWithJSON(&body); err != nil {
				c.JSON(400, gin.H{"status": "error", "message": "Invalid post data"})
				return
			}

			var InviteLink string = body.InviteLink
			var userID uint = c.GetUint("userID")
			var channelId string

			var result *gorm.DB = db.Raw(
				"SELECT channel_id FROM invite_codes WHERE invite_code = ?",
				InviteLink,
			).Scan(&channelId)
			if result.Error == sql.ErrNoRows {
				c.JSON(200, gin.H{"status": "error", "message": "invite code doesn't exist"})
				return
			} else if result.Error != sql.ErrNoRows && result.Error != nil {
				c.JSON(200, gin.H{"status": "error", "message": "database error"})
				return
			}

			err = db.Exec(
				"INSERT INTO user_channels (user_id, channel_id) VALUES (?, ?)",
				userID,
				channelId,
			).Error
			if err != nil {
				c.JSON(200, gin.H{"status": "error", "message": "Unable to join room, perhaps it doesn't exist?", "errorCode": "ErrNoRoom"})
				return
			}

			c.JSON(200, gin.H{"status": "success", "message": "joined channel successfully!"})
		})

		protectedApi.POST("uploadMessage", func(c *gin.Context) {
			type bodyData struct {
				Message   string `json:"message"`
				ChannelID string `json:"channel_id"`
			}

			var body bodyData
			var err error
			if err = c.ShouldBindBodyWithJSON(&body); err != nil {
				c.JSON(200, gin.H{"status": "error", "message": "Invalid request body"})
				return
			}

			if len(body.Message) < 1 {
				c.JSON(200, gin.H{"status": "error", "message": "Message content is required"})
				return
			}

			var userID any //I dislike this, I know the datatype SHOULD be uint
			var exists bool
			userID, exists = c.Get("userID")
			if !exists {
				c.JSON(200, gin.H{"status": "error", "message": "Unauthorised"})
				return
			}

			var message Message
			message = Message{
				UserID:    userID.(uint),
				ChannelID: body.ChannelID,
				Content:   html.EscapeString(body.Message),
			}

			if err = db.Create(&message).Error; err != nil {
				c.JSON(200, gin.H{"status": "error", "message": "Failed to save message"})
				return
			}

			c.JSON(200, gin.H{
				"status":  "success",
				"message": "Message sent",
				"data":    message,
			})
		})
	}
}
