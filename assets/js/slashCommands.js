export const wordLists = {
    "/createChatroom": async function(input) {
        console.log("making request:", input)
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
    "/createInvite": async function(input) {
        console.log(input)

        const resp = await fetch("/api/createLink", {
            method: "POST",
            body: JSON.stringify({
                "channel_name": input,
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