// media.js — управление локальным медиапотоком
let localStream = null;

export async function ensureLocalStream() {
    if (localStream) return localStream;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // По умолчанию микрофон выключаем (пользователь включит сам)
        for (const t of stream.getAudioTracks()) t.enabled = false;
        localStream = stream;
        return localStream;
    } catch (err) {
        console.warn('Не удалось получить доступ к микрофону — останемся без микрофона', err);
        localStream = null;
        alert('Микрофон не найден или доступ запрещён. Вы подключитесь без микрофона и будете только слушать других участников.');
        return null;
    }
}

export function getLocalStream() {
    return localStream;
}

export function setLocalStream(stream) {
    localStream = stream;
}
