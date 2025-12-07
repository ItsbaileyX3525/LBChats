import { getCookie } from '/assets/js/utils.js'

let ws = null
let reconnectAttempt = false

export function getWebSocket() {
    return ws
}

export function closeWebSocket() {
    if (ws) {
        ws.close()
        ws = null
    }
}

export function connectWebSocket() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        return
    }

    const channelID = getCookie("room") || "public"
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    ws = new WebSocket(`${protocol}//${window.location.host}/ws?channel_id=${channelID}`)

    ws.onopen = () => {
        reconnectAttempt = false
    }

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data)
            if (data.type === 'message') {
                addMessageToUI(data)
            } else if (data.type === 'sound') {
                playSound(data.sound_url)
            }
        } catch (error) {}
    }

    ws.onclose = () => {
        if (!reconnectAttempt) {
            reconnectAttempt = true
            setTimeout(() => {
                reconnectAttempt = false
                connectWebSocket()
            }, 3000)
        }
    }

    ws.onerror = (error) => {}
}

function addMessageToUI(data) {
    const messageContainer = document.getElementById("messages")
    const chatarea = document.getElementById("chatarea")
    if (!messageContainer) return

    const div = document.createElement("div")
    const span = document.createElement("span")
    const span2 = document.createElement("span")
    const div2 = document.createElement("div")
    
    div.classList.add("message", "other")
    span.classList.add("message-username")
    span2.classList.add("message-time")
    div2.classList.add("message-content")
    
    div.appendChild(span)
    div.appendChild(span2)
    div.appendChild(div2)
    messageContainer.appendChild(div)
    
    span.innerText = data.username
    span2.innerText = new Date(data.created_at).toLocaleString()
    div2.innerText = data.content

    if (chatarea) {
        chatarea.scrollTop = chatarea.scrollHeight
    }
}

function playSound(soundUrl) {
    try {
        const audio = new Audio(soundUrl)
        audio.volume = 0.5
        
        audio.addEventListener('loadedmetadata', () => {
            if (soundUrl.startsWith('http://') || soundUrl.startsWith('https://')) {
                if (audio.duration > 5) {
                    audio.pause()
                    audio.currentTime = 0
                    return
                }
            }
        })
        
        audio.play().catch(err => {})
    } catch (error) {}
}