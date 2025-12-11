import {
    showNotif
} from '/assets/js/notify.js'

const profilePictureForm = document.getElementById("profile-pic-form")
const usernameForm = document.getElementById("username-form")
const passwordForm = document.getElementById("password-form")
const profilePictureContainer = document.getElementById("preview-pic")

profilePictureForm.addEventListener("submit", async (e) => {
    e.preventDefault()
    const formData = new FormData(profilePictureForm)

    const resp = await fetch("/api/changeProfile", {
        method: "POST",
        body: formData
    })

    if (!resp.ok) {
        console.log("error with fetch request")
        return
    }

    const data = await resp.json()
    showNotif(data.message, "success", 4000)
    profilePictureContainer.src = data.url
})

usernameForm.addEventListener("submit", async (e) => {
    e.preventDefault()
    const formData = new FormData(usernameForm)
    const username = formData.get("username")

    const resp = await fetch("/api/changeUsername", {
        method: "POST",
        body: JSON.stringify({
            "username": username
        })
    })

    if (!resp.ok) {
        console.log("error with fetch request")
        return
    }

    const data = await resp.json()
    showNotif(data.message, "success", 4000)
})

passwordForm.addEventListener("submit", async (e) => {
    e.preventDefault()
    const formData = new FormData(passwordForm)
    const currPassword = formData.get("current_password")
    const newPassword = formData.get("new_password")
    const confirmPassword = formData.get("confirm_password")

    if (newPassword !== confirmPassword) {
        showNotif("Password's don't match", "error", 3500)
        return
    }

    const resp = await fetch("/api/changePassword", {
        method: "POST",
        body: JSON.stringify({
            "curr_password": currPassword,
            "new_password": newPassword,
        })
    })

    if (!resp.ok) {
        console.log("error with fetch request")
        return
    }

    const data = await resp.json()

    console.log(data)
    showNotif(data.message, data.status)
})

document.addEventListener("DOMContentLoaded", async () => {
    const resp = await fetch("/api/validateCookie", {
        method: "POST"
    })

    if (resp.status === 401) {
        window.location.href = "/login.html"
        return
    }

    if (!resp.ok) {
        document.getElementById("profilename").innerText = "Guest"
        return
    }

    const data = await resp.json()

    console.log(data)

    if (data.status == "error" || !data.status) {
        showNotif("Weird errors be here", "error", 99999)
        return
    }
    profilePictureContainer.src = data.profilePath
})