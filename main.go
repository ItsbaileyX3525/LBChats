package main

import (
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

var dbName string
var dbPass string
var dbUser string

func main() {

	godotenv.Load()

	dbName = os.Getenv("DBNAME")
	dbUser = os.Getenv("DBUSER")
	dbPass = os.Getenv("DBPASS")

	router := gin.Default()

	serveEndpoints(router)
	serveHTML(router)

	router.Static("/assets", "./assets")

	router.Run(":8080")
}
