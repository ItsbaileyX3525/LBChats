export function setCookie(name,value,days) {
    var expires = "";
    if (days) {
        var date = new Date()
        date.setTime(date.getTime() + (days*24*60*60*1000))
        expires = "; expires=" + date.toUTCString()
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/"
}

export function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

export function parseContent(content) {
    let parsedData = false
    const match = content.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (match) {
        const altText = match[1];
        const url = match[2]
        parsedData = {
            "alt" : altText,
            "url" : url
        }
    }
    return parsedData
}

function isNearBottom(el, threshold = 100) {
	return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
}

function scrollToBottom(el) {
	el.scrollTop = el.scrollHeight;
}

export function handleImage(img, chat) {
	const shouldStick = isNearBottom(chat);

	if (!img.complete) {
		img.addEventListener("load", () => {
			if (shouldStick) {
				scrollToBottom(chat);
			}
		}, { once: true });
	}
}