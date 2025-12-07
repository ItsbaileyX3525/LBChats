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
	createWebsockets(router, db)

	router.Static("/assets", "./assets")

	certFile := "./ssl/cert.pem"
	keyFile := "./ssl/key.pem"

	if _, err := os.Stat(certFile); err == nil {
		if _, err := os.Stat(keyFile); err == nil {
			log.Println("SSL certificates found, starting HTTPS server on port 443")
			if err := router.RunTLS(":443", certFile, keyFile); err != nil {
				log.Fatal("Failed to start HTTPS server:", err)
			}
			return
		}
	}

	log.Println("SSL certificates not found, starting HTTP server on port 8080")
	router.Run(":8080")
}
