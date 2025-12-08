import {
    getCookie
} from '/assets/js/utils.js'

import {
    getWebSocket
} from '/assets/js/ws.js'

import {
    addSystemMessage
} from '/assets/js/systemMessage.js'

export const wordLists = {
    "/createChatroom": async function(input) {
        if (!input) {
            addSystemMessage("Usage: /createChatroom <name>")
            return
        }
        
        const resp = await fetch("/api/createChannel", {
            method: "POST",
            body: JSON.stringify({
                "channel_name" : input,
            })
        })

        if (!resp.ok) {
            addSystemMessage("Failed to create channel")
            return
        }

        const data = await resp.json()
        if (data.status === "success") {
            addSystemMessage(`Channel "${input}" created successfully!`)
        } else {
            addSystemMessage("Failed to create channel")
        }
    },
    "/createInvite": async function() {
        let roomID = getCookie("room")
        
        if (roomID === "public") {
            addSystemMessage("Cannot create invite for public channel")
            return
        }
        
        const resp = await fetch("/api/createLink", {
            method: "POST",
            body: JSON.stringify({
                "channel_id": roomID,
            })
        })

        if (!resp.ok) {
            addSystemMessage("Failed to create invite code")
            return
        }

        const data = await resp.json()
        if (data.status === "success" && data.invite_link) {
            addSystemMessage(`Invite code created: ${data.invite_link}`)
        } else {
            addSystemMessage("Failed to create invite code")
        }
    },
    "/playSound": async function(input) {
        if (!input) {
            addSystemMessage("Usage: /playSound <filename|url>")
            return
        }
        
        let soundUrl = input.trim()
        let displayName = soundUrl
        
        if (soundUrl.startsWith('http://') || soundUrl.startsWith('https://')) {
            if (!soundUrl.endsWith('.mp3') && !soundUrl.endsWith('.ogg')) {
                addSystemMessage("URL must be an MP3 or OGG file")
                return
            }
        } else {
            soundUrl = `/assets/sounds/${soundUrl}`
            if (!soundUrl.endsWith('.mp3') && !soundUrl.endsWith('.ogg')) {
                soundUrl += '.mp3'
            }
        }
        
        const ws = getWebSocket()
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            addSystemMessage("Not connected to server")
            return
        }
        
        const channelID = getCookie("room")
        ws.send(JSON.stringify({
            type: 'sound',
            sound_url: soundUrl,
            channel_id: channelID
        }))
        
        addSystemMessage(`Playing sound: ${displayName}`)
    },
    "/sounds": async function() {
        addSystemMessage("Available sounds: 67, chestnut, chestnutesFull, diddyblud, dui, enrique, ez4ence, flashbang, gatito, teto")
    },
}