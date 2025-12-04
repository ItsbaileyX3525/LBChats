const form = document.getElementById("signup-form")
let signedUp = false

form.addEventListener("submit", async (e) => {
    if (signedUp) {
        return
    }
    signedUp = true
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
        signedUp = false
        return
    }

    const data = await resp.json()

    console.log(data)
    if (data.status == "success") {
        return
    } else {
        signedUp = false
    }
})