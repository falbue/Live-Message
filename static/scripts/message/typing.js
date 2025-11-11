export function typeText(elementId, text, speed = 100) {
    const el = document.querySelector(`#${elementId} b`);
    if (!el) return;
    el.textContent = '';
    let i = 0;
    const interval = setInterval(() => {
        if (i < text.length) {
            el.textContent += text.charAt(i++);
        } else {
            clearInterval(interval);
        }
    }, speed);
}