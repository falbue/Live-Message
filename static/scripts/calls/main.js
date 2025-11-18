import socketClient from '../socket-client.js';

const socket = socketClient.socket;
let joined = false;
let currentCount = 0;
const pcs = {}; // RTCPeerConnections by peer id (sid)
let localStream = null;
let isListener = false;

const audioBtn = document.getElementById('audioCallButton');
const copyTitle = document.querySelector('h3.inline.copy');

function updateUI() {
    if (!audioBtn) return;
    if (joined) {
        audioBtn.title = isListener ? 'Выйти из звонка (слушатель)' : 'Выйти из звонка';
        audioBtn.innerHTML = '<i class="iconoir-phone-disabled"></i>';
    } else {
        audioBtn.title = 'Войти в звонок';
        audioBtn.innerHTML = '<i class="iconoir-phone"></i>';
    }
    if (copyTitle) copyTitle.textContent = joined ? `В звонке${isListener ? ' (слушатель)' : ''} (${currentCount})` : '';
}

async function ensureLocalStream() {
    if (localStream) return localStream;
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        isListener = false;
        return localStream;
    } catch (err) {
        console.warn('Не удалось получить доступ к микрофону — подключаемся как слушатель', err);
        // Не прерываем соединение: работаем в режиме слушателя (recvonly)
        localStream = null;
        isListener = true;
        // Короткое уведомление пользователю
        alert('Микрофон не найден или доступ запрещён. Вы подключитесь как слушатель и будете слышать других участников.');
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
    socket.emit('join_call', { chat_id, listener: !!isListener });
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

updateUI();
