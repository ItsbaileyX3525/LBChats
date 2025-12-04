import {
    getCookie
 } from '/assets/js/utils.js'

export const wordLists = {
    "/createChatroom": async function(input) {
        const resp = await fetch("/api/createChannel", {
            method: "POST",
            body: JSON.stringify({
                "channel_name" : input,
            })
        })

        if (!resp.ok) {
            console.log("Fetch request failed")
            return
        }

        const data = await resp.json()

        console.log(data)
    },
    "/createInvite": async function() {
        let roomID = getCookie("room")
        console.log(roomID)
        const resp = await fetch("/api/createLink", {
            method: "POST",
            body: JSON.stringify({
                "channel_id": roomID,
            })
        })

        if (!resp.ok) {
            console.log("error with fetch request")
            return
        }

        const data = await resp.json()
        console.log(data)
    }
}