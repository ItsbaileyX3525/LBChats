import {
    showNotif
} from '/assets/js/notify.js'

const form = document.getElementById("login-form")

if (form) {
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
        showNotif("Error with fetch request", "error")
        return
    }

    const data = await resp.json()

    if (data.status) {
        showNotif(data.message, data.status)
    }
    if (data.status == "success") {
        setTimeout(() => {
            window.location.href = "/"
        }, 1000);
    }
});
}