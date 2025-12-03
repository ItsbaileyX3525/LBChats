const form = document.getElementById("chatbarform")
const chatInput = document.getElementById("chatinput")

form.addEventListener("submit", async (e) => {
    e.preventDefault()

    const formData = new FormData(form)

    console.log(formData.get("message"))

    chatInput.value = ""

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
})