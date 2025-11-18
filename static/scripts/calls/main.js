import socketClient from '../socket-client.js';

const socket = socketClient.socket;
let joined = false;
let currentCount = 0;
const pcs = {}; // RTCPeerConnections by peer id (sid)
let localStream = null;

const audioBtn = document.getElementById('audioCallButton');
const copyTitle = document.querySelector('h3.inline.copy');

async function ensureLocalStream() {
    if (localStream) return localStream;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // По умолчанию микрофон выключаем (пользователь включит сам)
        for (const t of stream.getAudioTracks()) t.enabled = false;
        localStream = stream;
        return localStream;
    } catch (err) {
        console.warn('Не удалось получить доступ к микрофону — останемся без микрофона', err);
        // Не прерываем соединение: работаем без микрофона
        localStream = null;
        // Короткое уведомление пользователю
        alert('Микрофон не найден или доступ запрещён. Вы подключитесь без микрофона и будете только слушать других участников.');
        return null;
    }
}

function createAudioElementForStream(stream, peerId) {
    const audio = document.createElement('audio');
    audio.autoplay = true;
    audio.playsInline = true;
    audio.dataset.peerId = peerId;
    audio.srcObject = stream;
    document.body.appendChild(audio);
}

function removeAudioElementsForPeer(peerId) {
    const els = document.querySelectorAll(`audio[data-peer-id="${peerId}"]`);
    els.forEach((el) => el.remove());
}

function createPeerConnection(peerId) {
    if (pcs[peerId]) return pcs[peerId];
    const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    pc.ontrack = (ev) => {
        // attach remote audio
        if (ev.streams && ev.streams[0]) {
            createAudioElementForStream(ev.streams[0], peerId);
        }
    };

    pc.onicecandidate = (ev) => {
        if (ev.candidate) {
            socket.emit('signal', { to: peerId, payload: { type: 'ice', candidate: ev.candidate } });
        }
    };

    pcs[peerId] = pc;
    return pc;
}

async function joinCall() {
    if (!socket) return;
    const chat_id = window.CHAT_ID;
    if (!chat_id) return;

    // Попытаться получить микрофон; если не получилось — работать в режиме слушателя
    await ensureLocalStream();
    socket.emit('join_call', { chat_id });
    // Показать кнопку микрофона (удалить скрывающий класс) — пользователь сам решит включать микрофон
    const muteBtn = document.getElementById('muteButton');
    if (muteBtn) muteBtn.classList.remove('hidden');
    updateUI();
}

function closeAllPeerConnections() {
    Object.keys(pcs).forEach((pid) => {
        try {
            pcs[pid].close();
        } catch (e) { }
        delete pcs[pid];
        removeAudioElementsForPeer(pid);
    });
}

function leaveCall() {
    if (!socket) return;
    const chat_id = window.CHAT_ID;
    if (!chat_id) return;
    socket.emit('leave_call', { chat_id });
    closeAllPeerConnections();
    // keep localStream available for rejoin; if you want to stop mic, stop tracks
    joined = false;
    currentCount = 0;
    updateUI();
}

if (audioBtn) {
    audioBtn.addEventListener('click', async () => {
        if (!joined) await joinCall();
        else leaveCall();
    });
}

// Socket event handlers for WebRTC signaling
if (socket) {
    socket.on('call_full', (data) => {
        console.warn('Call full', data);
        alert('В комнате звонка уже 12 участников — место занято.');
    });

    socket.on('call_joined', (data) => {
        joined = true;
        currentCount = data.count || currentCount;
        updateUI();
    });

    socket.on('peers', async (data) => {
        // list of existing peer ids — we will create offers to them
        const peers = data && data.peers ? data.peers : [];
        for (const pid of peers) {
            try {
                const pc = createPeerConnection(pid);
                // add local tracks if available, otherwise request recv-only audio
                if (localStream) {
                    for (const t of localStream.getTracks()) pc.addTrack(t, localStream);
                } else {
                    try {
                        pc.addTransceiver('audio', { direction: 'recvonly' });
                    } catch (e) {
                        console.warn('addTransceiver not supported or failed', e);
                    }
                }
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.emit('signal', { to: pid, payload: { type: 'offer', sdp: pc.localDescription } });
            } catch (err) {
                console.error('Ошибка создания offer', err);
            }
        }
    });

    socket.on('signal', async (data) => {
        const from = data.from;
        const payload = data.payload || {};
        if (!from || !payload) return;

        let pc = pcs[from];
        if (payload.type === 'offer') {
            // incoming offer: create PC if needed, set remote, answer
            pc = createPeerConnection(from);
            if (localStream) {
                for (const t of localStream.getTracks()) pc.addTrack(t, localStream);
            } else {
                try {
                    pc.addTransceiver('audio', { direction: 'recvonly' });
                } catch (e) {
                    console.warn('addTransceiver not supported or failed', e);
                }
            }
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit('signal', { to: from, payload: { type: 'answer', sdp: pc.localDescription } });
            } catch (err) {
                console.error('Ошибка при обработке offer', err);
            }
        } else if (payload.type === 'answer') {
            if (!pc) pc = createPeerConnection(from);
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            } catch (err) {
                console.error('Ошибка установки answer', err);
            }
        } else if (payload.type === 'ice') {
            if (!pc) pc = createPeerConnection(from);
            try {
                await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (err) {
                console.error('Ошибка добавления ICE', err);
            }
        }
    });

    socket.on('participant_joined', (data) => {
        currentCount = data.count || currentCount;
        updateUI();
    });

    socket.on('peer_left', (data) => {
        const peerId = data && data.peer_id;
        if (peerId && pcs[peerId]) {
            try { pcs[peerId].close(); } catch (e) { }
            delete pcs[peerId];
            removeAudioElementsForPeer(peerId);
        }
        currentCount = data.count || 0;
        updateUI();
    });

    socket.on('call_left', (data) => {
        currentCount = data.count || 0;
        if (data && data.chat_id === window.CHAT_ID && currentCount === 0) {
            joined = false;
            closeAllPeerConnections();
        }
        updateUI();
    });
}

// UI updates including mute button state
function updateUI() {
    if (!audioBtn) return;
    if (joined) {
        audioBtn.title = 'Выйти из звонка';
        audioBtn.innerHTML = '<i class="iconoir-phone-disabled"></i>';
    } else {
        audioBtn.title = 'Войти в звонок';
        audioBtn.innerHTML = '<i class="iconoir-phone"></i>';
    }
    if (copyTitle) copyTitle.textContent = joined ? `В звонке (${currentCount})` : '';

    const muteBtn = document.getElementById('muteButton');
    if (muteBtn) {
        // Показать/скрыть кнопку микрофона только при подключении
        if (joined) muteBtn.classList.remove('hidden');
        else muteBtn.classList.add('hidden');

        // Обновить состояние иконки в зависимости от наличия и состояния трека
        const hasStream = !!localStream;
        const enabled = hasStream && localStream.getAudioTracks().some((t) => t.enabled);
        if (!hasStream) {
            muteBtn.title = 'Включить микрофон (попробовать подключить)';
            muteBtn.innerHTML = '<i class="iconoir-microphone-mute-solid"></i>';
        } else if (enabled) {
            muteBtn.title = 'Выключить микрофон';
            muteBtn.innerHTML = '<i class="iconoir-microphone"></i>';
        } else {
            muteBtn.title = 'Включить микрофон';
            muteBtn.innerHTML = '<i class="iconoir-microphone-mute-solid"></i>';
        }
    }
}

// Обработчик кнопки микрофона: попытка включить/выключить микрофон
const muteBtnEl = document.getElementById('muteButton');
if (muteBtnEl) {
    muteBtnEl.addEventListener('click', async () => {
        // Если нет локального стрима — попытаться получить
        if (!localStream) {
            try {
                const stream = await ensureLocalStream();
                if (stream) {
                    // Добавить треки к уже существующим соединениям
                    for (const pid of Object.keys(pcs)) {
                        const pc = pcs[pid];
                        for (const t of stream.getTracks()) pc.addTrack(t, stream);
                    }
                }
            } catch (err) {
                // ensureLocalStream уже показывает alert, но на всякий случай лог
                console.error('Ошибка при попытке получить микрофон', err);
            }
        }

        if (localStream) {
            // Переключаем enabled для всех аудиотреков
            const tracks = localStream.getAudioTracks();
            const anyEnabled = tracks.some((t) => t.enabled);
            for (const t of tracks) t.enabled = !anyEnabled;
            updateUI();
        } else {
            // Нет микрофона — оставляем пользователя слушать
            alert('Микрофон не доступен. Вы остаетесь без микрофона.');
        }
    });
}

// Вызвать первоначальное обновление UI
updateUI();
