const form = document.getElementById("chatbarform")

form.addEventListener("submit", async (e) => {
    e.preventDefault()

    const formData = new FormData(form)

    console.log(formData.get("message"))

    const resp = await fetch("/api/uploadMessage", {
        method: "POST",
        body: JSON.stringify({
            "message": formData.get("message")
        })
    })
})