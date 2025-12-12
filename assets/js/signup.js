import {
    showNotif
} from '/assets/js/notify.js'

const form = document.getElementById("signup-form")
let signedUp = false
let widgetId = null;
let turnstileToken = '';

function initTurnstile() {
    if (!window.turnstile) {
        setTimeout(initTurnstile, 500);
        return;
    }
    
    var container = document.getElementById('turnstile-container');
    if (container) {
        widgetId = turnstile.render('#turnstile-container', {
            sitekey: '0x4AAAAAACDFfOKm7uvwfqiR',
            theme: 'dark',
            callback: function(token) {
                turnstileToken = token;
            }
        });
    }
}

function resetTurnstile() {
    if (window.turnstile && widgetId !== null) {
        turnstile.reset(widgetId);
        turnstileToken = '';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    initTurnstile();
});

form.addEventListener("submit", async (e) => {
    e.preventDefault()
    if (signedUp) {
        return
    }

    if (!turnstileToken) {
        showNotif('Please verify you are a human', 'error');
        return;
    }

    signedUp = true

    let formData = new FormData(form)

    let password  = formData.get("password")
    let confirmPassword = formData.get("confirm-password")
    if (password !== confirmPassword) {
        showNotif("passwords do not match", "error")
        signedUp = false
        resetTurnstile()
        return
    }

    const resp = await fetch("/api/createAccount", {
        method: "POST",
        body: JSON.stringify({
            "username" : formData.get("username"),
            "password" : password,
            "email" : formData.get("email"),
            "turnstile": turnstileToken
        })
    })

    if (!resp.ok) {
        showNotif("error with fetch request, try again", "error")
        signedUp = false
        resetTurnstile()
        return
    }

    const data = await resp.json()

    if (data.status == "success") {
        showNotif(data.message, data.status)
        setTimeout(() => {
            window.location.href = "/"
        }, 1000);
    } else {
        signedUp = false
        showNotif(data.message, data.status)
        resetTurnstile()
    }
})