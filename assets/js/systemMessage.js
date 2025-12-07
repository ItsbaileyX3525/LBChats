export function addSystemMessage(content) {
    const messageContainer = document.getElementById("messages")
    const chatarea = document.getElementById("chatarea")
    if (!messageContainer) return

    const div = document.createElement("div")
    const span = document.createElement("span")
    const span2 = document.createElement("span")
    const div2 = document.createElement("div")
    
    div.classList.add("message", "system")
    span.classList.add("message-username")
    span2.classList.add("message-time")
    div2.classList.add("message-content")
    
    div.appendChild(span)
    div.appendChild(span2)
    div.appendChild(div2)
    messageContainer.appendChild(div)
    
    span.innerText = "System"
    span2.innerText = new Date().toLocaleString()
    div2.innerText = content

    if (chatarea) {
        chatarea.scrollTop = chatarea.scrollHeight
    }
}
