export function addSystemMessage(content) {
    const messageContainer = document.getElementById("messages")
    const chatarea = document.getElementById("chatarea")
    if (!messageContainer) return

    const div = document.createElement("div")
    const img = document.createElement("img")
    const messageBody = document.createElement("div")
    const messageHeader = document.createElement("div")
    const span = document.createElement("span")
    const span2 = document.createElement("span")
    const div2 = document.createElement("div")
    
    div.classList.add("message", "system")
    img.classList.add("message-avatar")
    messageBody.classList.add("message-body")
    messageHeader.classList.add("message-header")
    span.classList.add("message-username")
    span2.classList.add("message-time")
    div2.classList.add("message-content")
    
    img.src = "/assets/images/admin.webp"
    img.alt = "System Avatar"
    
    messageHeader.appendChild(span)
    messageHeader.appendChild(span2)
    messageBody.appendChild(messageHeader)
    messageBody.appendChild(div2)
    div.appendChild(img)
    div.appendChild(messageBody)
    messageContainer.appendChild(div)
    
    span.innerText = "System"
    span2.innerText = new Date().toLocaleString()
    div2.innerText = content

    if (chatarea) {
        chatarea.scrollTop = chatarea.scrollHeight
    }
}
