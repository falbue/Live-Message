function notification(message, isError = false) {
  const existing = document.getElementById("notification");
  if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

  const notification = document.createElement("div");
  notification.id = "notification";
  notification.className = "notification";
  if (isError) notification.classList.add("error");
  notification.textContent = message;
  notification.classList.add("show");

  const appendNow = () => document.body.appendChild(notification);
  if (document.body) {
    appendNow();
  } else {
    document.addEventListener("DOMContentLoaded", appendNow, { once: true });
  }

  const removeAfterMs = 3000;
  setTimeout(() => {
    if (notification.parentNode) notification.parentNode.removeChild(notification);
  }, removeAfterMs);
}
