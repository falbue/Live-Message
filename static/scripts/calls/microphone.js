// microphone.js — управление звуком микрофона
let localStream = null;

// Возвращает локальный поток, не запрашивая разрешение заново.
export async function ensureLocalStream() {
    return localStream;
}

// Явно запросить доступ к микрофону (вызывается при включении микрофона пользователем).
export async function requestLocalStream() {
    if (localStream) return localStream;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // По умолчанию оставляем треки включёнными — UI решает, включать звук или нет.
        localStream = stream;
        return localStream;
    } catch (err) {
        console.warn('Не удалось получить доступ к микрофону — останемся без микрофона', err);
        localStream = null;
        return null;
    }
}

export function getLocalStream() {
    return localStream;
}

export function setLocalStream(stream) {
    localStream = stream;
}

// Включает все аудиотреки (создаёт поток при необходимости).
export async function enableMicrophone() {
    if (!localStream) {
        const s = await requestLocalStream();
        if (!s) return null;
    }
    try {
        for (const t of localStream.getAudioTracks()) t.enabled = true;
    } catch (e) { }
    return localStream;
}

// Отключает аудиотреки, но не останавливает поток целиком (можно быстро включить снова).
export function disableMicrophone() {
    if (!localStream) return;
    try {
        for (const t of localStream.getAudioTracks()) t.enabled = false;
    } catch (e) { }
}

export function isLocalStreamActive() {
    if (!localStream) return false;
    try {
        return localStream.getAudioTracks().some(t => t.enabled === true);
    } catch (e) {
        return false;
    }
}

// Полностью остановить поток и освободить микрофон у системы.
export function stopLocalStream() {
    if (!localStream) return;
    try {
        for (const t of localStream.getTracks()) {
            try { t.stop(); } catch (e) { }
        }
    } catch (e) { }
    localStream = null;
}
