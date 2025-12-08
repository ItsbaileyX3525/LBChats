const notif = document.getElementById("notify")
let currentlyActive = false
let timeout
let currentType = null

function removeClass() {
    if (!notif) return
    notif.classList.add("disabled")
    if (currentType) {
        notif.classList.remove(currentType)
    }
    currentlyActive = false
    currentType = null
}

export function showNotif(content, type = "info", duration = 7000) {
    if (!notif) return
    if (currentlyActive) {
        clearTimeout(timeout)
        removeClass()
    }
    currentlyActive = true
    currentType = type
    notif.innerText = content
    notif.classList.remove("disabled")
    notif.classList.add(type)

    timeout = setTimeout(() => {
        removeClass()
    }, duration);
}