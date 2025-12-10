const profilePictureForm = document.getElementById("profile-pic-form")
const usernameForm = document.getElementById("username-form")
const passwordForm = document.getElementById("password-form")

profilePictureForm.addEventListener("submit", () => {
    //
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

    console.log(data)
})

passwordForm.addEventListener("submit", async (e) => {
    e.preventDefault()
    const formData = new FormData(passwordForm)
    const currPassword = formData.get("current_password")
    const newPassword = formData.get("new_password")
    const confirmPassword = formData.get("confirm_password")

    if (newPassword !== confirmPassword) {

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
})

