const audioCallButton = document.getElementById('audioCallButton');
const videoCallButton = document.getElementById('videoCallButton');
const muteButton = document.getElementById('muteButton');
const acceptCallBtn = document.getElementById('acceptCall');
const declineCallBtn = document.getElementById('declineCall');
const videoContainer = document.getElementById('videoContainer');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ СОСТОЯНИЯ
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let isCaller = false;
let callType = 'audio';
let callTimeout = null;
let callId = null;
let pendingOffer = null;
let isVideoEnabled = false;
let isMuted = false;

// КОНФИГУРАЦИЯ WEBRTC
const iceServers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
    ]
};

// ИНИЦИАЛИЗАЦИЯ PEER CONNECTION
function initPeerConnection(isInitiator) {
    peerConnection = new RTCPeerConnection(iceServers);

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('webrtc:ice-candidate', {
                chatId,
                senderId,
                callId,
                candidate: event.candidate
            });
        }
    };

    peerConnection.ontrack = event => {
        const stream = event.streams[0];
        if (event.track.kind === 'video') {
            remoteVideo.srcObject = stream;
            videoContainer.classList.remove('hidden');
        } else if (event.track.kind === 'audio') {
            remoteVideo.srcObject = stream;
        }
    };

    if (localStream) {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
    }
}

// УПРАВЛЕНИЕ МЕДИАПОТОКОМ
async function getMedia(video = false) {
    try {
        const constraints = {
            audio: true,
            video: video ? { width: 320, height: 240 } : false
        };

        const newStream = await navigator.mediaDevices.getUserMedia(constraints);

        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }

        localStream = newStream;

        if (localVideo) {
            localVideo.srcObject = localStream;
        }

        if (peerConnection) {
            const localTracks = peerConnection.getSenders();
            localTracks.forEach(sender => {
                if (sender.track) {
                    if (sender.track.kind === 'video' && newStream.getVideoTracks()[0]) {
                        sender.replaceTrack(newStream.getVideoTracks()[0]);
                    }
                }
            });
        }

        return true;
    } catch (error) {
        console.error('Ошибка получения медиа:', error);
        notification('Не удалось получить доступ к микрофону/камере');
        return false;
    }
}

// УПРАВЛЕНИЕ ВИДИМОСТЬЮ КНОПОК
function hideAllButtons() {
    audioCallButton.classList.add('hidden');
    videoCallButton.classList.add('hidden');
    muteButton.classList.add('hidden');
    acceptCallBtn.classList.add('hidden');
    declineCallBtn.classList.add('hidden');
}

function showButtons(buttons) {
    hideAllButtons();
    buttons.forEach(btn => btn.classList.remove('hidden'));
}

// НАЧАЛО АУДИОЗВОНКА
async function startCall() {
    if (!await getMedia(false)) return;

    isCaller = true;
    callType = 'audio';
    callId = Date.now().toString(36) + Math.random().toString(36).substr(2);

    showButtons([videoCallButton, muteButton, declineCallBtn]);
    initPeerConnection(true);

    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        socket.emit('call:request', {
            chatId,
            senderId,
            callId,
            type: 'audio',
            sdp: offer
        });

        callTimeout = setTimeout(() => {
            if (isCaller) {
                endCall();
                notification('Звонок не был принят');
            }
        }, 30000);
    } catch (error) {
        console.error('Ошибка создания offer:', error);
        endCall();
    }
}

// ПЕРЕКЛЮЧЕНИЕ ВИДЕО (вкл/выкл)
async function toggleVideo() {
    if (!isVideoEnabled) {
        if (!await getMedia(true)) return;
        isVideoEnabled = true;
        videoCallButton.classList.add('active');
        localVideo.classList.remove('hidden');
        videoContainer.classList.remove('hidden');
    } else {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.stop();
            }
            const videoSender = peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
            if (videoSender) {
                peerConnection.removeTrack(videoSender);
            }
        }
        isVideoEnabled = false;
        videoCallButton.classList.remove('active');
        localVideo.classList.add('hidden');
        if (!remoteVideo.srcObject) {
            videoContainer.classList.add('hidden');
        }
    }
}

// ПЕРЕКЛЮЧЕНИЕ МИКРОФОНА (mute/unmute)
function toggleMute() {
    if (!localStream) return;

    localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
    });

    isMuted = !isMuted;
    muteButton.classList.toggle('muted', isMuted);
    if (isMuted) {
        muteButton.innerHTML = '<i class="iconoir-microphone-mute-solid"></i>';
    } else {
        muteButton.innerHTML = '<i class="iconoir-microphone"></i>';
    }
}

async function acceptCall() {
    clearTimeout(callTimeout);

    if (!pendingOffer) {
        console.error('Нет offer для ответа');
        declineCall();
        return;
    }

    if (!await getMedia(false)) {
        declineCall();
        return;
    }

    showButtons([videoCallButton, muteButton, declineCallBtn]);
    initPeerConnection(false);

    try {
        await peerConnection.setRemoteDescription(pendingOffer);

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        socket.emit('call:response', {
            chatId,
            senderId,
            callId,
            accepted: true,
            sdp: answer
        });

        pendingOffer = null;
    } catch (error) {
        console.error('Ошибка при принятии звонка:', error);
        declineCall();
    }
}

function declineCall() {
    clearTimeout(callTimeout);
    showButtons([audioCallButton]);

    socket.emit('call:response', {
        chatId,
        senderId,
        callId,
        accepted: false
    });

    endCall();
}

function endCall() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }

    if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
        remoteStream = null;
    }

    // localVideo.srcObject = null;
    // remoteVideo.srcObject = null;
    // videoContainer.classList.add('hidden');

    showButtons([audioCallButton]);

    clearTimeout(callTimeout);
    callId = null;
    pendingOffer = null;
    isCaller = false;
    isVideoEnabled = false;
    isMuted = false;
}

// ОБРАБОТКА СОБЫТИЙ ПОЛЬЗОВАТЕЛЯ
audioCallButton?.addEventListener('click', startCall);
videoCallButton?.addEventListener('click', toggleVideo);
muteButton?.addEventListener('click', toggleMute);
acceptCallBtn?.addEventListener('click', acceptCall);
declineCallBtn?.addEventListener('click', declineCall);

// ОБРАБОТКА СОКЕТ-СОБЫТИЙ
socket.on('call:incoming', data => {
    if (data.senderId === senderId) return;

    callType = data.type;
    callId = data.callId;
    pendingOffer = data.sdp;

    showButtons([acceptCallBtn, declineCallBtn]);
    notification("Поступил звонок");

    callTimeout = setTimeout(() => {
        declineCall();
    }, 30000);
});

socket.on('call:accepted', async data => {
    if (data.callId !== callId) return;

    clearTimeout(callTimeout);
    showButtons([videoCallButton, muteButton, declineCallBtn]);

    try {
        await peerConnection.setRemoteDescription(data.sdp);
    } catch (error) {
        console.error('Ошибка установки ответа от собеседника:', error);
        endCall();
    }
});

socket.on('call:rejected', data => {
    if (data.callId !== callId) return;

    clearTimeout(callTimeout);
    notification('Звонок отклонён');
    endCall();
});

socket.on('webrtc:ice-candidate', async data => {
    if (data.senderId === senderId || !peerConnection) return;

    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (error) {
        console.error('Ошибка добавления ICE кандидата:', error);
    }
});