import {
    showNotif
} from '/assets/js/notify.js'

const form = document.getElementById("signup-form")
let signedUp = false

form.addEventListener("submit", async (e) => {
    e.preventDefault()
    if (signedUp) {
        return
    }

    signedUp = true

    let formData = new FormData(form)

    let password  = formData.get("password")
    let confirmPassword = formData.get("confirm-password")
    if (password !== confirmPassword) {
        showNotif("passwords do not match", "error")
        signedUp = false
        return
    }

    const resp = await fetch("/api/createAccount", {
        method: "POST",
        body: JSON.stringify({
            "username" : formData.get("username"),
            "password" : password,
            "email" : formData.get("email")
        })
    })

    if (!resp.ok) {
        showNotif("error with fetch request, try again", "error")
        signedUp = false
        return
    }

    const data = await resp.json()

    if (data.status == "success") {
        showNotif(data.message, data.status)
        setTimeout(() => {
            window.location.href = "/"
        }, 4000);
    } else {
        signedUp = false
        showNotif(data.message, data.status)
    }
})