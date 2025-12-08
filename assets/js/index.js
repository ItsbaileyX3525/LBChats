import {
    setCookie, getCookie
} from '/assets/js/utils.js'

import {
    connectWebSocket, getWebSocket, closeWebSocket
} from '/assets/js/ws.js'

const createChannelBtn = document.getElementById("createChannelBtn")
const joinChannelBtn = document.getElementById("joinChannelBtn")
const themeToggle = document.getElementById('themeToggle');
const chatroomArea = document.getElementById("chatcontainer")
const messageContainer = document.getElementById("messages")
const loadMoreButton = document.getElementById("loadmore")

const createChannelModal = document.getElementById("createChannelModal")
const joinChannelModal = document.getElementById("joinChannelModal")
const channelActionsModal = document.getElementById("channelActionsModal")

const channelNameInput = document.getElementById("channelNameInput")
const inviteCodeInput = document.getElementById("inviteCodeInput")
const confirmCreateChannel = document.getElementById("confirmCreateChannel")
const cancelCreateChannel = document.getElementById("cancelCreateChannel")
const confirmJoinChannel = document.getElementById("confirmJoinChannel")
const cancelJoinChannel = document.getElementById("cancelJoinChannel")
const generateInviteBtn = document.getElementById("generateInviteBtn")
const closeChannelActions = document.getElementById("closeChannelActions")
const inviteCodeDisplay = document.getElementById("inviteCodeDisplay")
const generatedInviteCode = document.getElementById("generatedInviteCode")

let onPage = 0
let hasMore = false
let currentChannel = "public"

function loadThemes() {
  var root = document.documentElement;

  var moonSVG = '<svg class="icon icon-moon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z" fill="currentColor"/></svg>';
  var sunSVG = '<svg class="icon icon-sun" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var saved = localStorage.getItem('lbchats-theme');
  if (saved === 'light') {
    root.setAttribute('data-theme', 'light');
    if (themeToggle) themeToggle.innerHTML = sunSVG;
  } else {
    root.removeAttribute('data-theme');
    if (themeToggle) themeToggle.innerHTML = moonSVG;
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var isLight = root.getAttribute('data-theme') === 'light';
      if (isLight) {
        root.removeAttribute('data-theme');
        localStorage.setItem('lbchats-theme', 'dark');
        themeToggle.innerHTML = moonSVG;
      } else {
        root.setAttribute('data-theme', 'light');
        localStorage.setItem('lbchats-theme', 'light');
        themeToggle.innerHTML = sunSVG;
      }
    });
    themeToggle.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        themeToggle.click();
      }
    });
  }
}

async function joinChatroom(roomID) {
    return new Promise( async (resolve, reject) => {
        const resp = await fetch("/api/joinChannel", {
            method: "POST",
            body: JSON.stringify({
                "invite_link" : roomID,
            })
        })

        if (!resp.ok) {
            reject(new Error("Fetch request failed"))
            return
        }

        const data = await resp.json()

        if (data.status == "true") {
            resolve("Joined channel successfully!")
        } else {
            reject(new Error(data.message))
        }
    })
}

function appendToChatList(roomID, roomName) {
    if (document.getElementById(roomID)) { //Slap on a piece of tape
        return
    }
    
    const h2 = document.createElement("h2")
    h2.id = roomID
    h2.innerText = roomName
    chatroomArea.appendChild(h2)
    h2.classList.add("chatitle")
    h2.addEventListener("click", () => {
        switchChannel(roomID)
    })
    h2.addEventListener("contextmenu", (e) => {
        e.preventDefault()
        if (roomID !== "public") {
            showChannelActions(roomID, roomName)
        }
    })
}

function switchChannel(channelID) {
    setCookie("room", channelID, 99999)
    currentChannel = channelID
    messageContainer.innerHTML = ""
    onPage = 0
    
    closeWebSocket()
    setTimeout(() => {
        loadMessages()
        connectWebSocket()
    }, 100)
}

function showChannelActions(channelID, channelName) {
    currentChannel = channelID
    document.getElementById("channelActionsTitle").innerText = `${channelName} Options`
    inviteCodeDisplay.style.display = "none"
    channelActionsModal.style.display = "flex"
}

async function createChannel(channelName) {
    const resp = await fetch("/api/createChannel", {
        method: "POST",
        body: JSON.stringify({
            "channel_name": channelName
        })
    })

    if (!resp.ok) {
        return
    }

    const data = await resp.json()
    
    if (data.status === "success" && data.channel_id) {
        appendToChatList(data.channel_id, channelName)
        switchChannel(data.channel_id)
    }
}

async function joinChannel(inviteCode) {
    const resp = await fetch("/api/joinChannel", {
        method: "POST",
        body: JSON.stringify({
            "invite_link": inviteCode
        })
    })

    if (!resp.ok) {
        return
    }

    const data = await resp.json()
    
    if (data.status === "success") {
        loadUserChannels()
    }
}

async function generateInviteCode(channelID) {
    const resp = await fetch("/api/createLink", {
        method: "POST",
        body: JSON.stringify({
            "channel_id": channelID
        })
    })

    if (!resp.ok) {
        return
    }

    const data = await resp.json()
    
    if (data.status === "success" && data.invite_link) {
        generatedInviteCode.innerText = data.invite_link
        inviteCodeDisplay.style.display = "block"
    }
}

async function loadUserChannels() {
    const resp = await fetch("/api/userChannels", {
        method: "POST"
    })

    if (!resp.ok) {
        return
    }

    const data = await resp.json()
    
    if (data.status === "success" && data.channels) {
        for (let channel of data.channels) {
            if (channel.id !== "public") {
                appendToChatList(channel.id, channel.name)
            }
        }
    }
}

createChannelBtn.addEventListener("click", () => {
    createChannelModal.style.display = "flex"
    channelNameInput.value = ""
    channelNameInput.focus()
})

joinChannelBtn.addEventListener("click", () => {
    joinChannelModal.style.display = "flex"
    inviteCodeInput.value = ""
    inviteCodeInput.focus()
})

confirmCreateChannel.addEventListener("click", () => {
    const channelName = channelNameInput.value.trim()
    if (channelName) {
        createChannel(channelName)
        createChannelModal.style.display = "none"
    }
})

cancelCreateChannel.addEventListener("click", () => {
    createChannelModal.style.display = "none"
})

confirmJoinChannel.addEventListener("click", () => {
    const inviteCode = inviteCodeInput.value.trim()
    if (inviteCode) {
        joinChannel(inviteCode)
        joinChannelModal.style.display = "none"
    }
})

cancelJoinChannel.addEventListener("click", () => {
    joinChannelModal.style.display = "none"
})

generateInviteBtn.addEventListener("click", () => {
    generateInviteCode(currentChannel)
})

closeChannelActions.addEventListener("click", () => {
    channelActionsModal.style.display = "none"
})

createChannelModal.addEventListener("click", (e) => {
    if (e.target === createChannelModal) {
        createChannelModal.style.display = "none"
    }
})

joinChannelModal.addEventListener("click", (e) => {
    if (e.target === joinChannelModal) {
        joinChannelModal.style.display = "none"
    }
})

channelActionsModal.addEventListener("click", (e) => {
    if (e.target === channelActionsModal) {
        channelActionsModal.style.display = "none"
    }
})

channelNameInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        confirmCreateChannel.click()
    }
})

inviteCodeInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        confirmJoinChannel.click()
    }
})

async function loadMessages() {
    let roomID = getCookie("room")
    const resp = await fetch("/api/getMessages", {
        method: "POST",
        body: JSON.stringify({
            "channel_id": roomID,
            "on_page": onPage,
        })
    })

    if (resp.status == 401) {
        window.location.href = "/login.html"
        return
    }

    const data = await resp.json()

    if (!data.messages) {
        return
    }

    hasMore = data.has_more || false
    
    if (hasMore) {
        loadMoreButton.style.display = "block"
    } else {
        loadMoreButton.style.display = "none"
    }
    
    if (onPage === 0) {
        for (let i = data.messages.length - 1; i >= 0; i--) {
            const e = data.messages[i]
            const div = document.createElement("div")
            const div2 = document.createElement("div")
            const span = document.createElement("span")
            const span2 = document.createElement("span")
            
            div.classList.add("message", "other")
            span.classList.add("message-username")
            span2.classList.add("message-time")
            div2.classList.add("message-content")
            
            div.appendChild(span)
            div.appendChild(span2)
            div.appendChild(div2)
            
            span.innerText = e.Username
            span2.innerText = new Date(e.created_at || e.CreatedAt).toLocaleString()
            div2.innerText = e.Content
            
            messageContainer.appendChild(div)
        }
        
        const chatarea = document.getElementById("chatarea")
        if (chatarea) {
            chatarea.scrollTop = chatarea.scrollHeight
        }
    } else {
        for (let i = 0; i < data.messages.length; i++) {
            const e = data.messages[i]
            const div = document.createElement("div")
            const div2 = document.createElement("div")
            const span = document.createElement("span")
            const span2 = document.createElement("span")
            
            div.classList.add("message", "other")
            span.classList.add("message-username")
            span2.classList.add("message-time")
            div2.classList.add("message-content")
            
            div.appendChild(span)
            div.appendChild(span2)
            div.appendChild(div2)
            
            span.innerText = e.Username
            span2.innerText = new Date(e.created_at || e.CreatedAt).toLocaleString()
            div2.innerText = e.Content
            
            if (messageContainer.firstChild) {
                messageContainer.insertBefore(div, messageContainer.firstChild)
            } else {
                messageContainer.appendChild(div)
            }
        }
    }
}

loadMoreButton.addEventListener("click", () => {
    onPage++
    loadMessages()
})

const publicChatroom = document.getElementById("public")
if (publicChatroom) {
    publicChatroom.addEventListener("click", () => {
        switchChannel("public")
    })
}

document.addEventListener('DOMContentLoaded', function () {
    setCookie("room", "public", 99999)
    loadThemes()
    loadUserChannels()
    loadMessages()
    connectWebSocket()
});