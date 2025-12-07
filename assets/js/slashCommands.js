import {
    getCookie
} from '/assets/js/utils.js'

import {
    getWebSocket
} from '/assets/js/ws.js'

export const wordLists = {
    "/createChatroom": async function(input) {
        const resp = await fetch("/api/createChannel", {
            method: "POST",
            body: JSON.stringify({
                "channel_name" : input,
            })
        })

        if (!resp.ok) {
            return
        }

        const data = await resp.json()
    },
    "/createInvite": async function() {
        let roomID = getCookie("room")
        const resp = await fetch("/api/createLink", {
            method: "POST",
            body: JSON.stringify({
                "channel_id": roomID,
            })
        })

        if (!resp.ok) {
            return
        }

        const data = await resp.json()
    },
    "/playSound": async function(input) {
        if (!input) return
        
        let soundUrl = input.trim()
        
        if (soundUrl.startsWith('http://') || soundUrl.startsWith('https://')) {
            if (!soundUrl.endsWith('.mp3') && !soundUrl.endsWith('.ogg')) {
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
            return
        }
        
        const channelID = getCookie("room")
        ws.send(JSON.stringify({
            type: 'sound',
            sound_url: soundUrl,
            channel_id: channelID
        }))
    }
}