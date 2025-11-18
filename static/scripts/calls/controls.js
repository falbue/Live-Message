// controls.js — обработчики кнопок (вызов, микрофон)
import * as callManager from './callManager.js';
import * as media from './media.js';
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
        if (!media.getLocalStream()) {
            try {
                const stream = await media.ensureLocalStream();
                if (stream) {
                    rtc.addLocalTracksToAll(stream);
                }
            } catch (err) {
                console.error('Ошибка при попытке получить микрофон', err);
            }
        }

        const localStream = media.getLocalStream();
        if (localStream) {
            const tracks = localStream.getAudioTracks();
            const anyEnabled = tracks.some((t) => t.enabled);
            for (const t of tracks) t.enabled = !anyEnabled;
            ui.updateUI(callManager.isJoined(), callManager.getCurrentCount(), localStream);
        } else {
            notification('Микрофон не доступен');
        }
    });
}
