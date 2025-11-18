export function server_command(text, speed = 50, elementId = "displayMessage") {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.innerHTML = '<b></b>';
    const b = el.querySelector('b');
    if (!b) return;
    b.style.whiteSpace = 'pre-wrap';
    b.textContent = '';
    let i = 0;
    const interval = setInterval(() => {
        if (i < text.length) {
            b.textContent += text.charAt(i++);
        } else {
            clearInterval(interval);
        }
    }, speed);
}