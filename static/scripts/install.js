// PWA Install Button Logic
let deferredPrompt;
const installButton = document.getElementById("installButton");

// Check if app is already running in standalone mode
function isRunningStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone ||
    document.referrer.includes("android-app://")
  );
}

// Hide install button if app is already installed/running standalone
if (isRunningStandalone()) {
  installButton.style.display = "none";
}

// Listen for the beforeinstallprompt event
window.addEventListener("beforeinstallprompt", (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Save the event so it can be triggered later
  deferredPrompt = e;
  // Show the install button only if not in standalone mode
  if (!isRunningStandalone()) {
    installButton.classList.remove("hidden");
  }
});

// Handle install button click
installButton.addEventListener("click", async () => {
  if (!deferredPrompt) {
    return;
  }

  // Show the install prompt
  deferredPrompt.prompt();

  // Wait for the user to respond to the prompt
  const { outcome } = await deferredPrompt.userChoice;

  if (outcome === "accepted") {
    console.log("User accepted the install prompt");
    // Show notification using the existing notification function
    if (typeof notification === "function") {
      notification("Приложение устанавливается...");
    }
  } else {
    console.log("User dismissed the install prompt");
  }

  // Clear the deferredPrompt so it can only be used once
  deferredPrompt = null;
  // Hide the install button after use
  installButton.classList.add("hidden");
});

// Listen for app installed event
window.addEventListener("appinstalled", () => {
  console.log("PWA was installed");
  // Hide the install button
  installButton.classList.add("hidden");
  // Clear the deferredPrompt
  deferredPrompt = null;

  // Show notification using the existing notification function
  if (typeof notification === "function") {
    notification("Приложение успешно установлено!");
  }
});

