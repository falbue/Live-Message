// controls.js — обработчики кнопок (вызов, микрофон)
import * as callManager from './callManager.js';
import * as microphone from './microphone.js';
import * as rtc from './rtc.js';
import * as ui from './ui.js';

const audioBtn = document.getElementById('audioCallButton');
if (audioBtn) {
    audioBtn.addEventListener('click', async () => {
        if (!callManager.isJoined()) await callManager.joinCall();
        else callManager.leaveCall();
    });
}

const muteBtnEl = document.getElementById('muteButton');
if (muteBtnEl) {
    muteBtnEl.addEventListener('click', async () => {
        // Если микрофон ещё не запрашивали — запросим при попытке включить звук.
        const localStream = microphone.getLocalStream();
        if (!localStream) {
            try {
                const stream = await microphone.requestLocalStream();
                if (stream) {
                    // По умолчанию после запроса считаем, что пользователь хочет звук — добавляем треки.
                    rtc.addLocalTracksToAll(stream);
                }
                ui.updateUI(callManager.isJoined(), callManager.getCurrentCount(), microphone.getLocalStream());
                return;
            } catch (err) {
                console.error('Ошибка при попытке получить микрофон', err);
                notification('Микрофон не доступен');
                return;
            }
        }

        // Если поток есть — переключаем состояние: если включён — выключаем и полностью останавливаем поток,
        // чтобы освободить микрофон у системы и убрать треки из peer connection.
        const tracks = localStream.getAudioTracks();
        const anyEnabled = tracks.some((t) => t.enabled);
        if (anyEnabled) {
            try { rtc.removeLocalTracksFromAll(localStream); } catch (e) { }
            try { microphone.stopLocalStream(); } catch (e) { }
        } else {
            // Включаем микрофон: запросим/включим треки и добавим их в peer connections
            try {
                const stream = await microphone.enableMicrophone();
                if (stream) rtc.addLocalTracksToAll(stream);
            } catch (e) { console.error('Ошибка при включении микрофона', e); }
        }
        ui.updateUI(callManager.isJoined(), callManager.getCurrentCount(), microphone.getLocalStream());
    });
}
