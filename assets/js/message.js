import {
    wordLists
} from '/assets/js/slashCommands.js'

import {
    getCookie
} from '/assets/js/utils.js'

const form = document.getElementById("chatbarform")
const chatInput = document.getElementById("chatinput")
let validSlashCommands = []

async function submitMessage(message) {
    const wordSplit = message.split(" ")
    if (validSlashCommands.includes(wordSplit[0])) {
        wordLists[wordSplit[0]](wordSplit[1])
        return
    }
    const channelID = getCookie("room")
    console.log(message)
    console.log(channelID)
    const resp = await fetch("/api/uploadMessage", {
        method: "POST",
        body: JSON.stringify({
            "message": message,
            "channel_id" : channelID,
        })
    })

    if (!resp.ok) {
        console.log("Error with fetch request")
        return
    }

    const data = await resp.json()

    if (data.status == "success") {
        console.log(data.message)
    } else {
        console.log(data.message)
    }
}

form.addEventListener("submit", async (e) => {
    e.preventDefault()
    const formData = new FormData(form)
    chatInput.value = ""
    submitMessage(formData.get("message"))

})

document.addEventListener("DOMContentLoaded", () => {
    validSlashCommands = Object.keys(wordLists)
    //console.log(validSlashCommands)
    return
})