const form = document.getElementById("signup-form")


form.addEventListener("submit", async (e) => {
    e.preventDefault()

    let formData = new FormData(form)

    const resp = await fetch("/api/createAccount", {
        method: "POST",
        body: JSON.stringify({
            "username" : formData.get("username"),
            "password" : formData.get("password"),
            "email" : formData.get("email")
        })
    })

    if (!resp.ok) {
        console.log("something went wrong with the fetch request")
        return
    }

    const data = await resp.json()

    console.log(data)

    console.log(formData.get("password"))
})