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
const cmdbox = document.getElementById("cmd-box")
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

document.addEventListener("DOMContentLoaded", () => {
    validSlashCommands = Object.keys(wordLists)
})