import {
    showNotif
} from '/assets/js/notify.js'

const form = document.getElementById("login-form")
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
            sitekey: '0x4AAAAAACF6f_jGomlzkgVg',
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

if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault()

        if (!turnstileToken) {
            showNotif('Please verify you are a human', 'error');
            return;
        }

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
            resetTurnstile()
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
        } else {
            resetTurnstile()
        }
    });
}