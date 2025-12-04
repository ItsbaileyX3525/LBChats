import {
    setCookie, getCookie
} from '/assets/js/utils.js'

const newChatButton = document.getElementById("newchatbtn")
const themeToggle = document.getElementById('themeToggle');
const chatroomArea = document.getElementById("chatcontainer")

let onPage = 0

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
                "channel_id" : roomID,
            })
        })

        if (!resp.ok) {
            reject(new Error("Fetch request failed"))
            return
        }

        const data = await resp.json()

        console.log("Fetch data:", data)

        if (data.status == "true") {
            resolve("Joined channel successfully!")
        } else {
            reject(new Error(data.message))
        }
    })
}

function appendToChatList(roomID) {
    const h2 = document.createElement("h2")
    h2.id = roomID
    h2.innerText = `Room: ${roomID}`
    chatroomArea.appendChild(h2)
    h2.classList.add("chatitle")
}

async function addNewChat(roomID) {
    joinChatroom(roomID)
        .then(result => {
            console.log(result)
            appendToChatList(roomID)
        })
        .catch(err => {
            console.log(err)
        })
}

newChatButton.addEventListener("click", () => {
    console.log("Click")
    addNewChat(1)
})

/*async function loadUserData() {
    const resp = await fetch("/api/profile", {
        method: "POST",
        body: JSON.stringify({

        })
    })
}*/

async function loadMessages() {
    let roomID = getCookie("room")
    console.log(roomID)
    const resp = await fetch("/api/getMessages", {
        method: "POST",
        body: JSON.stringify({
            "channel_id": roomID,
            "on_page": onPage,
        })
    })

    const data = await resp.json()

    console.log(data)
}

document.addEventListener('DOMContentLoaded', function () {
    setCookie("room", "public", 99999)
    loadThemes()
    //loadUserData()
    loadMessages()
});