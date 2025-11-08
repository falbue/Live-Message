const socket = (window.socket = io());
const chatId = window.location.pathname.split("/").pop();
const inputMessage = document.getElementById("inputMessage");
const displayMessage = document.getElementById("displayMessage");
const senderId = Math.random().toString(36).substr(2, 9);





function formatMessage(message) {
  const escapeHtml = (str) => {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  };
  let escapedMessage = escapeHtml(message);

  const codeBlockPattern = /```([\s\S]*?)```/g;
  escapedMessage = escapedMessage.replace(
    codeBlockPattern,
    '<pre class="block-code"><code>$1</code></pre>',
  );
  return escapedMessage.replace(/\n/g, "<br>");
}

socket.emit("join_chat", { chat_id: chatId, sender_id: senderId });

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
