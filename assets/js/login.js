const form = document.getElementById("login-form")

form.addEventListener("submit", async (e) => {
    e.preventDefault()

    const formData = new FormData(form)


    const resp = await fetch("/api/login", {
        method: "POST",
        body: JSON.stringify({
            "username" : formData.get("username"),
            "password": formData.get("password")
        })
    })

    if (!resp.ok) {
        console.log("Error with fetch request")
        return
    }

    const data = await resp.json()

    console.log(data)
})