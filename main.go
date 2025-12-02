package main

import (
	"log"
	"os"

	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"gorm.io/gorm"
)

var dbName string
var dbPass string
var dbUser string
var secretKey string

func main() {

	godotenv.Load()

	dbName = os.Getenv("DBNAME")
	dbUser = os.Getenv("DBUSER")
	dbPass = os.Getenv("DBPASS")
	secretKey = os.Getenv("COOKIEKEY")
	if secretKey == "" {
		secretKey = "plssetakey"
	}

	//gin.SetMode(gin.ReleaseMode) //uncomment prod
	router := gin.Default()
	store := cookie.NewStore([]byte(secretKey))
	router.Use(sessions.Sessions("lesession", store))

	var db *gorm.DB
	var err error
	db, err = connectDB()
	if err != nil {
		log.Print("Database not initialised or whatever")
		//return
	}

	serveEndpoints(router, db)
	serveHTML(router)
	createAuth(router, db)

	router.Static("/assets", "./assets")

	router.Run(":8080")
}
