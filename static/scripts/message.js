const socket = (window.socket = io());
const chatId = window.location.pathname.split("/").pop();
const inputMessage = document.getElementById("inputMessage");
const displayMessage = document.getElementById("displayMessage");
const senderId = Math.random().toString(36).substr(2, 9);

document.addEventListener('DOMContentLoaded', () => {
    if (window.hljs && typeof hljs.highlightAll === 'function') {
        try { hljs.highlightAll(); } catch (e) { }
    }
});

function formatMessage(message) {
    const escapeHtml = (str) => {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    };

    const codeBlockPattern = /```(\w+)?\n?([\s\S]*?)```/g;
    let result = "";
    let lastIndex = 0;
    let match;

    while ((match = codeBlockPattern.exec(message)) !== null) {
        const [full, lang, code] = match;
        const before = message.slice(lastIndex, match.index);
        result += escapeHtml(before).replace(/\n/g, "<br>");

        const langClass = lang ? `language-${lang}` : "";
        const escapedCode = escapeHtml(code);

        result += `<pre><code class="${langClass}">${escapedCode}</code></pre>`;

        lastIndex = match.index + full.length;
    }

    const rest = message.slice(lastIndex);
    result += escapeHtml(rest).replace(/\n/g, "<br>");

    return result;
}

socket.emit("update_message", {
    chat_id: chatId,
    text: "Пользователь подключился!",
    sender_id: senderId,
});

inputMessage.addEventListener("input", () => {
    const messageText = inputMessage.value.trim() || "...";
    socket.emit("update_message", {
        chat_id: chatId,
        text: messageText,
        sender_id: senderId,
    });
});

socket.on("receive_message", (data) => {
    if (data.sender_id !== senderId) {
        displayMessage.innerHTML = formatMessage(data.text);

        const codeBlocks = displayMessage.querySelectorAll("pre code");
        if (window.hljs && codeBlocks.length) {
            codeBlocks.forEach((block) => {
                try {
                    hljs.highlightElement(block);
                } catch (e) { }
            });
        }
    }
});

function typeText(elementId, text) {
    const element = document.querySelector(`#${elementId} b`);
    let i = 0;

    const interval = setInterval(() => {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
        } else {
            clearInterval(interval);
        }
    }, 100); // Задержка между символами
}

document.addEventListener("DOMContentLoaded", () => {
    typeText("displayMessage", "Ожидание пользователя...");
});
