let ws = null

export function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    ws = new WebSocket(`${protocol}//${window.location.host}/ws`)

    ws.onopen = () => {
        console.log('WebSocket connected')
        ws.send(JSON.stringify({
            type: 'message',
            content: 'Hello from the client!'
        }))
    }

    ws.onmessage = (event) => {
        console.log('Received:', event.data)
    }

    ws.onclose = () => {
        console.log('WebSocket disconnected')
        setTimeout(connectWebSocket, 3000)
    }

    ws.onerror = (error) => {
        console.error('WebSocket error:', error)
    }
}