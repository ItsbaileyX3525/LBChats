import { getCookie, parseContent, handleImage } from '/assets/js/utils.js'

let ws = null
let reconnectAttempt = false
const messageContainer = document.getElementById("messages")
const chatarea = document.getElementById("chatarea")

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
    if (!messageContainer) return

    const div = document.createElement("div")
    const img = document.createElement("img")
    const messageBody = document.createElement("div")
    const messageHeader = document.createElement("div")
    const span = document.createElement("span")
    const span2 = document.createElement("span")
    const div2 = document.createElement("div")
    
    div.classList.add("message", "other")
    img.classList.add("message-avatar")
    messageBody.classList.add("message-body")
    messageHeader.classList.add("message-header")
    span.classList.add("message-username")
    span2.classList.add("message-time")
    div2.classList.add("message-content")

    img.src = data.profile_path || `/assets/images/profile${Math.floor(Math.random() * 4) + 1}.png`
    img.alt = "Avatar"
    
    messageHeader.appendChild(span)
    messageHeader.appendChild(span2)
    messageBody.appendChild(messageHeader)
    messageBody.appendChild(div2)
    div.appendChild(img)
    div.appendChild(messageBody)
    messageContainer.appendChild(div)
    
    span.innerText = data.username
    span2.innerText = new Date(data.created_at).toLocaleString()
    let parsed = parseContent(data.content)
    if (parsed) {
        const imgMsg = document.createElement("img")
        imgMsg.src = parsed.url
        imgMsg.alt = parsed.alt
        div2.appendChild(imgMsg)
        handleImage(imgMsg, chatarea)
    } else {
        div2.innerText = data.content
    }

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