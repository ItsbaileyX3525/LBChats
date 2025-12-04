import {
    wordLists
} from '/assets/js/slashCommands.js'

const form = document.getElementById("chatbarform")
const chatInput = document.getElementById("chatinput")
let validSlashCommands = []

async function submitMessage(message) {
    const wordSplit = message.split(" ")
    console.log(wordSplit)
    if (validSlashCommands.includes(wordSplit[0])) {
        wordLists[wordSplit[0]](wordSplit[1])
    }
    return

    const resp = await fetch("/api/uploadMessage", {
        method: "POST",
        body: JSON.stringify({
            "message": formData.get("message"),
            "channel_id" : 1
        })
    })

    if (!resp.ok) {
        console.log("Error with fetch request")
        return
    }

    const data = await resp.json()

    //TODO: Add notifcation stuff
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