const audioCallButton = document.getElementById('audioCallButton');
const videoCallButton = document.getElementById('videoCallButton');
const incomingCall = document.getElementById('incomingCall');
const acceptCallBtn = document.getElementById('acceptCall');
const declineCallBtn = document.getElementById('declineCall');
const callTypeDisplay = document.getElementById('callType');
const endCallBtn = document.getElementById('endCall');
const videoContainer = document.getElementById('videoContainer');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const callControls = document.getElementById('endCall');

// Состояния звонка
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let isCaller = false;
let currentCallType = null;
let callTimeout = null;
let callId = null;
let pendingOffer = null;

// ⚠️ REMOVED STATIC iceServers — now loaded dynamically
let iceServers = null;

// Загружаем TURN-конфигурацию при старте
async function loadIceServers() {
    try {
        const res = await fetch('/turn-config');
        if (!res.ok) throw new Error('Failed to load TURN config');
        const config = await res.json();
        iceServers = config.iceServers; // Только массив серверов
        console.log('ICE Servers loaded:', iceServers);
    } catch (err) {
        console.warn('Не удалось загрузить TURN-конфигурацию:', err);
        iceServers = [
            { urls: 'stun:stun.l.google.com:19302' }
        ];
    }
}

// Инициализация PeerConnection
function initPeerConnection(isInitiator) {
    if (!iceServers) {
        console.error('ICE серверы не загружены!');
        alert('Ошибка инициализации WebRTC');
        return;
    }
    
    // ДОБАВЬ ЭТОТ ОБЪЕКТ КОНФИГУРАЦИИ:
    const configuration = {
        iceServers: iceServers,
        iceTransportPolicy: "relay",  // ПРИНУДИТЕЛЬНО ИСПОЛЬЗОВАТЬ TURN
        bundlePolicy: "max-bundle",
        rtcpMuxPolicy: "require"
    };
    
    peerConnection = new RTCPeerConnection(configuration);

    // ДОБАВЬ ЛОГИРОВАНИЕ СОСТОЯНИЯ:
    peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE Connection State:', peerConnection.iceConnectionState);
        if (peerConnection.iceConnectionState === 'failed' || 
            peerConnection.iceConnectionState === 'disconnected') {
            console.error('ICE connection failed:', peerConnection.iceConnectionState);
            // Попробовать пересоздать соединение
            setTimeout(() => {
                if (callId && peerConnection.iceConnectionState !== 'connected') {
                    console.log('Recreating connection...');
                    endCall();
                     // Попробовать перезвонить через 2 секунды
                     setTimeout(() => {
                         if (currentCallType) {
                             startCall(currentCallType);
                         }
                     }, 2000);
                }
            }, 1000);
        }
        if (peerConnection.iceConnectionState === 'connected' || 
            peerConnection.iceConnectionState === 'completed') {
            console.log('✅ ICE connection successful via TURN!');
        }
    };

    peerConnection.onconnectionstatechange = () => {
        console.log('Connection State:', peerConnection.connectionState);
    };

    peerConnection.onicegatheringstatechange = () => {
        console.log('ICE Gathering State:', peerConnection.iceGatheringState);
    };

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            console.log('Sending ICE candidate:', event.candidate);
            console.log('Candidate type:', event.candidate.type); // relay, host, srflx
            socket.emit('webrtc:ice-candidate', {
                chatId,
                senderId,
                callId,
                candidate: event.candidate
            });
        } else {
            console.log('ICE gathering completed');
            // После завершения сбора кандидатов, проверяем состояние
            setTimeout(() => {
                if (peerConnection.iceConnectionState === 'checking') {
                    console.log('Still checking after gathering completed...');
                }
            }, 1000);
        }
    };

    peerConnection.ontrack = event => {
        if (!remoteStream) {
            remoteStream = new MediaStream();
            remoteVideo.srcObject = remoteStream;
        }
        remoteStream.addTrack(event.track);
        console.log('Remote track received:', event.track.kind);
    };

    if (localStream) {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
    }
}

// Получение медиапотока
async function getMedia(type) {
    try {
        const constraints = {
            audio: true,
            video: type === 'video' ? { width: 320, height: 240 } : false
        };

        localStream = await navigator.mediaDevices.getUserMedia(constraints);

        if (localVideo) {
            localVideo.srcObject = localStream;
        }

        return true;
    } catch (error) {
        console.error('Ошибка получения медиа:', error);
        alert('Не удалось получить доступ к микрофону/камере');
        return false;
    }
}

// Начало звонка (звонящий)
async function startCall(type) {
    if (!await getMedia(type)) return;

    isCaller = true;
    currentCallType = type;
    callId = Date.now().toString(36) + Math.random().toString(36).substr(2);

    toggleCallButtons(false);
    callControls.classList.remove('hidden');

    initPeerConnection(true);

    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        socket.emit('call:request', {
            chatId,
            senderId,
            callId,
            type,
            sdp: offer
        });

        callTimeout = setTimeout(() => {
            if (isCaller) {
                endCall();
                notification('Звонок не был принят');
            }
        }, 30000);

        if (type === 'video') {
            setupVideoContainer(true);
        }
    } catch (error) {
        console.error('Ошибка создания offer:', error);
        endCall();
    }
}

// Принятие звонка (вызываемый)
async function acceptCall() {
    clearTimeout(callTimeout);

    if (!pendingOffer) {
        console.error('Нет offer для ответа');
        declineCall();
        return;
    }

    if (!await getMedia(currentCallType)) {
        declineCall();
        return;
    }
    
    acceptCallBtn.classList.add('hidden');
    declineCallBtn.classList.add('hidden');
    callControls.classList.remove('hidden');

    initPeerConnection(false);

    try {
        await peerConnection.setRemoteDescription(pendingOffer);

        // Обработка отложенных кандидатов
        if (peerConnection.queuedRemoteCandidates) {
            console.log('Processing queued candidates:', peerConnection.queuedRemoteCandidates.length);
            for (const candidate of peerConnection.queuedRemoteCandidates) {
                try {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                    console.log('Queued candidate added');
                } catch (e) {
                    console.error('Ошибка добавления отложенного кандидата:', e);
                }
            }
            peerConnection.queuedRemoteCandidates = [];
        }

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        socket.emit('call:response', {
            chatId,
            senderId,
            callId,
            accepted: true,
            sdp: answer
        });

        if (currentCallType === 'video') {
            setupVideoContainer(true);
        }

        pendingOffer = null;
    } catch (error) {
        console.error('Ошибка при принятии звонка:', error);
        declineCall();
    }
}

// Отклонение звонка
function declineCall() {
    clearTimeout(callTimeout);
    acceptCallBtn.classList.add('hidden');
    declineCallBtn.classList.add('hidden');
    toggleCallButtons(true);

    socket.emit('call:response', {
        chatId,
        senderId,
        callId,
        accepted: false
    });

    endCall();
}

// Завершение звонка
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

    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    videoContainer.classList.add('hidden');
    callControls.classList.add('hidden');

    acceptCallBtn.classList.add('hidden');
    declineCallBtn.classList.add('hidden');
    toggleCallButtons(true);

    clearTimeout(callTimeout);
    callId = null;
    pendingOffer = null;
    isCaller = false;

    // Отправка события завершения — только если callId существует
    if (callId) {
        socket.emit('call:end', {
            chatId,
            senderId,
            callId
        });
    }
}

// Настройка видео-контейнера
function setupVideoContainer(show) {
    if (!show) {
        videoContainer.classList.add('hidden');
        return;
    }

    videoContainer.classList.remove('hidden');
    localVideo.classList.add('mini');
    remoteVideo.classList.add('mini');

    localVideo.onclick = () => toggleFullscreen(localVideo);
    remoteVideo.onclick = () => toggleFullscreen(remoteVideo);
}

// Полноэкранный режим
function toggleFullscreen(videoElement) {
    if (!document.fullscreenElement) {
        videoElement.classList.remove('mini');
        videoElement.classList.add('fullscreen');
        videoElement.requestFullscreen().catch(err => {
            console.error(`Ошибка полноэкранного режима: ${err.message}`);
            videoElement.classList.add('mini');
            videoElement.classList.remove('fullscreen');
        });
    } else {
        document.exitFullscreen();
        videoElement.classList.add('mini');
        videoElement.classList.remove('fullscreen');
    }
}

// Управление кнопками звонков
function toggleCallButtons(show) {
    audioCallButton.classList.toggle('hidden', !show);
    videoCallButton.classList.toggle('hidden', !show);
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
// Загружаем конфигурацию ICE один раз при запуске
loadIceServers().then(() => {
    // Слушатели событий — активируем только после загрузки конфига
    audioCallButton?.addEventListener('click', () => startCall('audio'));
    videoCallButton?.addEventListener('click', () => startCall('video'));
    acceptCallBtn?.addEventListener('click', acceptCall);
    declineCallBtn?.addEventListener('click', declineCall);
    endCallBtn?.addEventListener('click', endCall);
});

// Сокет-события (не зависят от ICE config)
socket.on('call:incoming', data => {
    if (data.senderId === senderId) return;

    currentCallType = data.type;
    callId = data.callId;
    pendingOffer = data.sdp;

    acceptCallBtn.classList.remove('hidden');
    declineCallBtn.classList.remove('hidden');
    notification("Поступил звонок");
    toggleCallButtons(false);

    callTimeout = setTimeout(() => {
        declineCall();
    }, 30000);
});

socket.on('call:accepted', async data => {
    if (data.callId !== callId) return;

    clearTimeout(callTimeout);
    acceptCallBtn.classList.add('hidden');
    declineCallBtn.classList.add('hidden');

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

socket.on('call:ended', data => {
    if (data.callId !== callId) return;
    clearTimeout(callTimeout);
    notification('Звонок завершён');
    endCall();
});

// ОБНОВЛЁННЫЙ обработчик ICE-кандидатов с логированием
socket.on('webrtc:ice-candidate', async data => {
    console.log('Call IDs - mine:', callId, 'received:', data.callId);
    console.log('Receiving ICE candidate:', data.candidate);
    console.log('Peer connection exists:', !!peerConnection);
    console.log('Remote description set:', !!peerConnection?.remoteDescription);
    
    if (data.senderId === senderId || !peerConnection || data.callId !== callId) {
        console.log('Skipping candidate - conditions not met');
        return;
    }

    try {
        if (peerConnection.remoteDescription) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            console.log('ICE candidate added successfully');
        } else {
            console.log('Remote description not set yet, queuing candidate');
            if (!peerConnection.queuedRemoteCandidates) {
                peerConnection.queuedRemoteCandidates = [];
            }
            peerConnection.queuedRemoteCandidates.push(data.candidate);
        }
    } catch (error) {
        console.error('Ошибка добавления ICE кандидата:', error);
        console.error('Candidate ', data.candidate);
    }
});

// Добавим обработчики состояния соединения Socket.IO
socket.on('connect', () => {
    console.log('Socket connected');
});

socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
});

socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
});

document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        localVideo?.classList.add('mini');
        localVideo?.classList.remove('fullscreen');
        remoteVideo?.classList.add('mini');
        remoteVideo?.classList.remove('fullscreen');
    }
});