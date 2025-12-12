import {
    getWebSocket
} from '/assets/js/ws.js'
import {
    wordLists
} from '/assets/js/slashCommands.js'

import {
    getCookie
} from '/assets/js/utils.js'

const form = document.getElementById("chatbarform")
const chatInput = document.getElementById("chatinput")
const uploadButton = document.getElementById("uploadbtn")
const sendButton = document.getElementById("sendbtn")
const cmdbox = document.getElementById("commandsuggestions")
let validSlashCommands = []

async function submitMessage(message) {
    if (message.startsWith('/')) {
        const wordSplit = message.split(" ")
        if (validSlashCommands.includes(wordSplit[0])) {
            wordLists[wordSplit[0]](wordSplit[1])
        }
        return
    }
    
    const channelID = getCookie("room")
    
    const ws = getWebSocket()
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        return
    }
    
    ws.send(JSON.stringify({
        type: 'message',
        content: message,
        channel_id: channelID
    }))


}

if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault()
        const formData = new FormData(form)
        if (chatInput) chatInput.value = ""
        if (cmdbox) {
            cmdbox.style.display = "none";
        }
        submitMessage(formData.get("message"))
    })
}

uploadButton.addEventListener("click", () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.name = "image"
    input.style.display = "none"

    document.body.appendChild(input)

    input.addEventListener("change", async () => {
        if (!input.files || input.files.length === 0) {
            input.remove()
            return
        }

        const formData = new FormData();
        formData.append('image', input.files[0])

        const resp = await fetch("/api/uploadImage", {
            method: "POST",
            body: formData
        })

        if (!resp.ok) {
            console.log("Error uploading image")
            input.remove()
            return
        }

        const data = await resp.json()
        input.remove()

        if (data.status && data.status == "success") {
            console.log(data.message)
            if (data.url) {
                chatinput.value = `![Image](${data.url})`
                sendButton.click()
            }
        } else {
            console.log(data.message)
        }
        
    })

    input.click()
})


document.addEventListener("DOMContentLoaded", () => {
    validSlashCommands = Object.keys(wordLists)
})