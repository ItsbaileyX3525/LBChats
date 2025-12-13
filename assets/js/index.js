import {
    setCookie, getCookie, parseContent, handleImage
} from '/assets/js/utils.js'

import {
    connectWebSocket, closeWebSocket
} from '/assets/js/ws.js'

import {
    addSystemMessage
} from '/assets/js/systemMessage.js'


const createChannelBtn = document.getElementById("createChannelBtn")
const joinChannelBtn = document.getElementById("joinChannelBtn")
const themeToggle = document.getElementById('themeToggle')
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
const volumeBtn = document.getElementById("volumeBtn")
const volumeSliderContainer = document.getElementById("volumeSliderContainer")
const volumeSlider = document.getElementById("volume-slider")
const logoutBtn = document.getElementById("logout-btn")
const settingsBtn = document.getElementById("settingsButton")
const chatinput = document.getElementById("chatinput")
const cmdbox = document.getElementById("commandsuggestions")
const publicChatroom = document.getElementById("public")
const channelActionsTitle = document.getElementById("channelActionsTitle")
const profilename = document.getElementById("profilename")
const profilepic = document.getElementById("profilepic")
const chatarea = document.getElementById("chatarea")

let onPage = 0
let hasMore = false
let currentChannel = "public"

const commands = [
  "/createChatroom - Creates a chatroom",
  "/createInvite - Creates an invite for current chatroom",
  "/playSound [SoundName] - Plays a sound",
  "/sounds - Shows sound list",
  "/leaveGroup - Leave current group chat"
]

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
        var resp = await fetch("/api/joinChannel", {
            method: "POST",
            body: JSON.stringify({
                "invite_link" : roomID,
            })
        })

        if (!resp.ok) {
            reject(new Error("Fetch request failed"))
            return
        }

        var data = await resp.json()

        if (data.status == "true") {
            resolve("Joined channel successfully!")
        } else {
            reject(new Error(data.message))
        }
    })
}

function appendToChatList(roomID, roomName) {
    if (document.getElementById(roomID)) {
        return
    }
    
    var h2 = document.createElement("h2")
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
    channelActionsTitle.innerText = `${channelName} Options`
    inviteCodeDisplay.style.display = "none"
    channelActionsModal.style.display = "flex"
}

async function createChannel(channelName) {
    var resp = await fetch("/api/createChannel", {
        method: "POST",
        body: JSON.stringify({
            "channel_name": channelName
        })
    })

    if (!resp.ok) {
        return
    }

    var data = await resp.json()
    
    if (data.status === "success" && data.channel_id) {
        appendToChatList(data.channel_id, channelName)
        switchChannel(data.channel_id)
    }
}

async function joinChannel(inviteCode) {
    var resp = await fetch("/api/joinChannel", {
        method: "POST",
        body: JSON.stringify({
            "invite_link": inviteCode
        })
    })

    if (!resp.ok) {
        return
    }

    var data = await resp.json()
    
    if (data.status === "success") {
        loadUserChannels()
    } else {
        addSystemMessage(data.message)
    }
}

async function generateInviteCode(channelID) {
    var resp = await fetch("/api/createLink", {
        method: "POST",
        body: JSON.stringify({
            "channel_id": channelID
        })
    })

    if (!resp.ok) {
        return
    }

    var data = await resp.json()
    
    if (data.status === "success" && data.invite_link) {
        generatedInviteCode.innerText = data.invite_link
        inviteCodeDisplay.style.display = "block"
    }
}

async function loadUserChannels() {
    var resp = await fetch("/api/userChannels", {
        method: "POST"
    })

    if (!resp.ok) {
        return
    }

    var data = await resp.json()
    
    if (data.status === "success" && data.channels) {
        for (var i = 0; i < data.channels.length; i++) {
            if (data.channels[i].id !== "public") {
                appendToChatList(data.channels[i].id, data.channels[i].name)
            }
        }
    }
}

async function loadProfileUsername() {
    try {
        var resp = await fetch("/api/validateCookie", {
            method: "POST"
        })

        if (resp.status === 401) {
            window.location.href = "/login.html"
            return
        }

        if (!resp.ok) {
            profilename.innerText = "Guest"
            return
        }

        var data = await resp.json()

        if (data.status === "success" && data.username) {
            profilename.innerText = data.username
            profilepic.src = data.profilePath || `/assets/images/profile${Math.floor(Math.random() * 4) + 1}.png`
        } else {
            profilename.innerText = "Guest"
        }
    } catch (error) {
        profilename.innerText = "Guest"
    }
}

if (createChannelBtn) {
    createChannelBtn.addEventListener("click", () => {
        createChannelModal.style.display = "flex"
        channelNameInput.value = ""
        channelNameInput.focus()
    })
}

if (joinChannelBtn) {
    joinChannelBtn.addEventListener("click", () => {
        joinChannelModal.style.display = "flex"
        inviteCodeInput.value = ""
        inviteCodeInput.focus()
    })
}

if (confirmCreateChannel) {
    confirmCreateChannel.addEventListener("click", () => {
        var channelName = channelNameInput.value.trim()
        if (channelName) {
            createChannel(channelName)
            createChannelModal.style.display = "none"
        }
    })
}

if (cancelCreateChannel) {
    cancelCreateChannel.addEventListener("click", () => {
        createChannelModal.style.display = "none"
    })
}

if (confirmJoinChannel) {
    confirmJoinChannel.addEventListener("click", () => {
        var inviteCode = inviteCodeInput.value.trim()
        if (inviteCode) {
            joinChannel(inviteCode)
            joinChannelModal.style.display = "none"
        }
    })
}

if (cancelJoinChannel) {
    cancelJoinChannel.addEventListener("click", () => {
        joinChannelModal.style.display = "none"
    })
}

if (generateInviteBtn) {
    generateInviteBtn.addEventListener("click", () => {
        generateInviteCode(currentChannel)
    })
}

if (closeChannelActions) {
    closeChannelActions.addEventListener("click", () => {
        channelActionsModal.style.display = "none"
    })
}

if (createChannelModal) {
    createChannelModal.addEventListener("click", (e) => {
        if (e.target === createChannelModal) {
            createChannelModal.style.display = "none"
        }
    })
}

if (joinChannelModal) {
    joinChannelModal.addEventListener("click", (e) => {
        if (e.target === joinChannelModal) {
            joinChannelModal.style.display = "none"
        }
    })
}

if (channelActionsModal) {
    channelActionsModal.addEventListener("click", (e) => {
        if (e.target === channelActionsModal) {
            channelActionsModal.style.display = "none"
        }
    })
}

if (channelNameInput) {
    channelNameInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            confirmCreateChannel.click()
        }
    })
}

if (inviteCodeInput) {
    inviteCodeInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            confirmJoinChannel.click()
        }
    })
}

async function loadMessages() {
    var roomID = getCookie("room")
    var resp = await fetch("/api/getMessages", {
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

    var data = await resp.json()

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
        for (var i = data.messages.length - 1; i >= 0; i--) {
            var e = data.messages[i]
            var div = document.createElement("div")
            var img = document.createElement("img")
            var messageBody = document.createElement("div")
            var messageHeader = document.createElement("div")
            var span = document.createElement("span")
            var span2 = document.createElement("span")
            var div2 = document.createElement("div")
            
            div.classList.add("message", "other")
            img.classList.add("message-avatar")
            div.dataset.userId = e.UserID || e.user_id || ""
            messageBody.classList.add("message-body")
            messageHeader.classList.add("message-header")
            span.classList.add("message-username")
            span2.classList.add("message-time")
            div2.classList.add("message-content")

            if (!e.ProfilePath) {
                img.src = `/assets/images/profile${Math.floor(Math.random() * 4) + 1}.png`
            } else {
                img.src = e.ProfilePath
            }
            img.alt = "Avatar"
            
            messageHeader.appendChild(span)
            messageHeader.appendChild(span2)
            messageBody.appendChild(messageHeader)
            messageBody.appendChild(div2)
            div.appendChild(img)
            div.appendChild(messageBody)
            messageContainer.appendChild(div)
            
            span.innerText = e.Username
            span2.innerText = new Date(e.created_at || e.CreatedAt).toLocaleString()
            let parsed = parseContent(e.Content)
            if (parsed) {
                const imgMsg = document.createElement("img")
                imgMsg.src = parsed.url
                imgMsg.alt = parsed.alt
                div2.appendChild(imgMsg)
                handleImage(imgMsg, chatarea)
            } else {
                div2.innerText = e.Content
            }
        }
        
        if (chatarea) {
            chatarea.scrollTop = chatarea.scrollHeight
        }
    } else {
        for (var i = 0; i < data.messages.length; i++) {
            var e = data.messages[i]
            var div = document.createElement("div")
            var img = document.createElement("img")
            var messageBody = document.createElement("div")
            var messageHeader = document.createElement("div")
            var span = document.createElement("span")
            var span2 = document.createElement("span")
            var div2 = document.createElement("div")
            
            div.classList.add("message", "other")
            img.classList.add("message-avatar")
            div.dataset.userId = e.UserID || e.user_id || ""
            messageBody.classList.add("message-body")
            messageHeader.classList.add("message-header")
            span.classList.add("message-username")
            span2.classList.add("message-time")
            div2.classList.add("message-content")
            
            if (!e.ProfilePath) {
                img.src = `/assets/images/profile${Math.floor(Math.random() * 4) + 1}.png`
            } else {
                img.src = e.ProfilePath
            }
            
            img.alt = "Avatar"
            
            messageHeader.appendChild(span)
            messageHeader.appendChild(span2)
            messageBody.appendChild(messageHeader)
            messageBody.appendChild(div2)
            div.appendChild(img)
            div.appendChild(messageBody)
            
            span.innerText = e.Username
            span2.innerText = new Date(e.created_at || e.CreatedAt).toLocaleString()
            let parsed = parseContent(e.Content)
            if (parsed) {
                const imgMsg = document.createElement("img")
                imgMsg.src = parsed.url
                imgMsg.alt = parsed.alt
                div2.appendChild(imgMsg)
            } else {
                div2.innerText = e.Content
            }
            
            if (messageContainer.firstChild) {
                messageContainer.insertBefore(div, messageContainer.firstChild)
            } else {
                messageContainer.appendChild(div)
            }
        }
    }
}

if (loadMoreButton) {
    loadMoreButton.addEventListener("click", () => {
        onPage++
        loadMessages()
    })
}

if (publicChatroom) {
    publicChatroom.addEventListener("click", () => {
        switchChannel("public")
    })
}

document.addEventListener('DOMContentLoaded', function () {
    setCookie("room", "public", 99999)
    loadThemes()
    loadProfileUsername()
    loadUserChannels()
    loadMessages()
    connectWebSocket()
})

if (chatinput) {
    chatinput.addEventListener("input", () => {
      var value = chatinput.value.trim()

      if(value.startsWith("/") && cmdbox){
        cmdbox.innerHTML = commands
          .map(cmd => `<div class="cmd-item">${cmd}</div>`)
          .join("")
        cmdbox.style.display = "block"
      } else if (cmdbox) {
        cmdbox.style.display = "none"
      }

      var cmdItems = document.querySelectorAll(".cmd-item")
      cmdItems.forEach(item => {
        item.addEventListener("click", () => {
          chatinput.value = item.innerText.split(" - ")[0] + " "
          if (cmdbox) cmdbox.style.display = "none"
          chatinput.focus()
        })
      })
    })
}

if (volumeBtn) {
    volumeBtn.classList.remove("disabled")
    volumeBtn.disabled = false
    
    volumeBtn.addEventListener("click", () => {
        if (volumeSliderContainer.style.display === "none") {
            volumeSliderContainer.style.display = "flex"
        } else {
            volumeSliderContainer.style.display = "none"
        }
    })
}

if (volumeSlider) {
    var savedVolume = localStorage.getItem('lbchats-volume')
    if (savedVolume) {
        volumeSlider.value = savedVolume
    }
    
    volumeSlider.addEventListener("input", (e) => {
        var volume = e.target.value / 100
        localStorage.setItem('lbchats-volume', e.target.value)
        

        document.querySelectorAll("audio").forEach(audio => {
            audio.volume = volume
        })
    })
}

logoutBtn.addEventListener("click", () => {
    window.location.href = "/api/logout"
})

settingsBtn.addEventListener("click", () => {
    window.location.href = "/settings"
})

// Context Menu
const contextMenu = document.getElementById("messageContextMenu")
const copyUserIdBtn = document.getElementById("copyUserId")
const copyUsernameBtn = document.getElementById("copyUsername")
const copyMessageContentBtn = document.getElementById("copyMessageContent")

var currentContextTarget = null

function showContextMenu(e, messageElement) {
    e.preventDefault()
    currentContextTarget = messageElement
    
    var x = e.clientX
    var y = e.clientY
    
    if (x + 180 > window.innerWidth) {
        x = window.innerWidth - 190
    }
    if (y + 120 > window.innerHeight) {
        y = window.innerHeight - 130
    }
    
    contextMenu.style.left = x + "px"
    contextMenu.style.top = y + "px"
    contextMenu.style.display = "block"
}

function hideContextMenu() {
    contextMenu.style.display = "none"
    currentContextTarget = null
}

if (messageContainer) {
    messageContainer.addEventListener("contextmenu", (e) => {
        var msg = e.target.closest(".message")
        if (msg) {
            showContextMenu(e, msg)
        }
    })
}

document.addEventListener("click", (e) => {
    if (contextMenu && !contextMenu.contains(e.target)) {
        hideContextMenu()
    }
})

if (copyUserIdBtn) {
    copyUserIdBtn.addEventListener("click", () => {
        if (currentContextTarget) {
            var userId = currentContextTarget.dataset.userId || "Unknown"
            navigator.clipboard.writeText(userId)
            hideContextMenu()
        }
    })
}

if (copyUsernameBtn) {
    copyUsernameBtn.addEventListener("click", () => {
        if (currentContextTarget) {
            var usernameEl = currentContextTarget.querySelector(".message-username")
            var username = usernameEl ? usernameEl.textContent : ""
            navigator.clipboard.writeText(username)
            hideContextMenu()
        }
    })
}

if (copyMessageContentBtn) {
    copyMessageContentBtn.addEventListener("click", () => {
        if (currentContextTarget) {
            var contentEl = currentContextTarget.querySelector(".message-content")
            var content = contentEl ? contentEl.textContent : ""
            navigator.clipboard.writeText(content)
            hideContextMenu()
        }
    })
}