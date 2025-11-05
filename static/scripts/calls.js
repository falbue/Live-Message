

// DOM элементы
const videoContainer = document.getElementById('videoContainer');
const createCallButton = document.getElementById('createCall');
const declineCallButton = document.getElementById('declineCall');
const toggleCameraButton = document.getElementById('toggleCamera');
const toggleMicButton = document.getElementById('toggleMic');
const incomingCallModal = document.getElementById('incomingCallModal');
const acceptCallButton = document.getElementById('acceptCall');
const rejectCallButton = document.getElementById('rejectCall');
const callerNameElement = document.getElementById('callerName');
const callControls = document.querySelector('.call-controls');
const mediaSettingsModal = document.getElementById('mediaSettingsModal');
const startCallButton = document.getElementById('startCallButton');
const incomingUseCamera = document.getElementById('incomingUseCamera');
const incomingUseMicrophone = document.getElementById('incomingUseMicrophone');

// Переменные для WebRTC
let localStream = null;
let peerConnections = {}; // {userId: RTCPeerConnection}
let remoteStreams = {}; // {userId: MediaStream}
let isAudioMuted = false;
let isVideoMuted = false;
let currentCallerId = null;
let hasCamera = false;
let hasMicrophone = false;

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    // Регистрация в чате
    socket.emit('join_chat', {
        chat_id: chatId,
        sender_id: senderId,
        username: `User-${senderId.substr(0, 5)}`
    });
    
    // Настройка модальных окон
    createCallButton.addEventListener('click', () => {
        mediaSettingsModal.classList.remove('hidden');
    });
    
    startCallButton.addEventListener('click', () => {
        const callType = document.querySelector('input[name="callType"]:checked').value;
        mediaSettingsModal.classList.add('hidden');
        
        let useCamera = false;
        let useMicrophone = false;
        
        switch(callType) {
            case 'video':
                useCamera = true;
                useMicrophone = true;
                break;
            case 'audio':
                useCamera = false;
                useMicrophone = true;
                break;
            case 'listen':
                useCamera = false;
                useMicrophone = false;
                break;
        }
        
        startCall(useCamera, useMicrophone);
    });
    
    acceptCallButton.addEventListener('click', () => {
        const useCamera = incomingUseCamera.checked;
        const useMicrophone = incomingUseMicrophone.checked;
        incomingCallModal.classList.add('hidden');
        joinCall(useCamera, useMicrophone);
    });
    
    rejectCallButton.addEventListener('click', () => {
        incomingCallModal.classList.add('hidden');
        socket.emit('leave_call', { chat_id: chatId });
    });
    
    declineCallButton.addEventListener('click', endCall);
    
    toggleCameraButton.addEventListener('click', toggleCamera);
    toggleMicButton.addEventListener('click', toggleMicrophone);
    
    // Закрытие модальных окон при клике вне их
    document.addEventListener('click', (e) => {
        if (e.target === mediaSettingsModal) mediaSettingsModal.classList.add('hidden');
        if (e.target === incomingCallModal) incomingCallModal.classList.add('hidden');
    });
});

// Начать звонок (инициатор)
async function startCall(useCamera = true, useMicrophone = true) {
    try {
        notification('Подготовка к звонку...');
        
        // Очистка предыдущих ресурсов
        cleanupResources();
        
        // Получение медиапотока с учетом настроек
        await getLocalStream(useCamera, useMicrophone);
        
        // Обновление интерфейса управления
        updateCallControls(useCamera, useMicrophone);
        
        // Отправка уведомления о начале звонка
        socket.emit('start_call', { chat_id: chatId });
        
        // Показать элементы управления звонком
        createCallButton.classList.add('hidden');
        declineCallButton.classList.remove('hidden');
        
        notification('Звонок начат');
    } catch (error) {
        console.error('Ошибка начала звонка:', error);
        cleanupResources();
        notification('Ошибка звонка: ' + (error.message || error));
    }
}

// Присоединиться к звонку
async function joinCall(useCamera = true, useMicrophone = true) {
    try {
        notification('Подключение к звонку...');
        
        // Очистка предыдущих ресурсов
        cleanupResources();
        
        // Получение медиапотока с учетом настроек
        await getLocalStream(useCamera, useMicrophone);
        
        // Обновление интерфейса управления
        updateCallControls(useCamera, useMicrophone);
        
        // Отправка уведомления о присоединении
        socket.emit('join_call', { chat_id: chatId });
        
        // Показать элементы управления звонком
        createCallButton.classList.add('hidden');
        declineCallButton.classList.remove('hidden');
        
        notification('Вы в звонке');
    } catch (error) {
        console.error('Ошибка присоединения к звонку:', error);
        cleanupResources();
        notification('Ошибка подключения: ' + (error.message || error));
    }
}

// Получение медиапотока с обработкой ошибок
async function getLocalStream(useVideo = true, useAudio = true) {
    hasCamera = useVideo;
    hasMicrophone = useAudio;
    
    try {
        // Попытка получить запрошенные устройства
        const constraints = {
            video: useVideo ? { width: { ideal: 640 }, height: { ideal: 480 } } : false,
            audio: useAudio
        };
        
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Проверка наличия треков
        const videoTracks = localStream.getVideoTracks();
        const audioTracks = localStream.getAudioTracks();
        
        hasCamera = useVideo && videoTracks.length > 0;
        hasMicrophone = useAudio && audioTracks.length > 0;
        
        isVideoMuted = !hasCamera;
        isAudioMuted = !hasMicrophone;
        
        // Обработка случаев, когда устройства отключены после получения потока
        if (hasCamera && !useVideo) {
            videoTracks.forEach(track => track.stop());
            hasCamera = false;
            isVideoMuted = true;
        }
        
        if (hasMicrophone && !useAudio) {
            audioTracks.forEach(track => track.stop());
            hasMicrophone = false;
            isAudioMuted = true;
        }
        
        // Создание локального видеоэлемента
        createLocalVideoElement();
        
        return localStream;
    } catch (error) {
        console.error('Ошибка получения медиапотока:', error);
        
        // Обработка частных случаев ошибок
        if (error.name === 'NotAllowedError') {
            throw new Error('Доступ к устройствам запрещен. Разрешите доступ в настройках браузера.');
        }
        
        if (error.name === 'NotFoundError') {
            throw new Error('Устройства не найдены. Проверьте подключение камеры и микрофона.');
        }
        
        if (error.name === 'NotReadableError') {
            // Попытка получить поток без видео
            if (useVideo && useAudio) {
                notification('Камера недоступна. Попытка подключиться только с микрофоном.');
                return getLocalStream(false, true);
            }
            // Попытка получить поток без аудио
            if (useVideo && !useAudio) {
                throw new Error('Камера занята другим приложением. Закройте другие программы, использующие камеру.');
            }
            // Попытка получить поток без аудио
            if (!useVideo && useAudio) {
                throw new Error('Микрофон недоступен. Проверьте подключение и разрешения.');
            }
        }
        
        // Если все попытки неудачны, создаем пустой поток
        localStream = new MediaStream();
        hasCamera = false;
        hasMicrophone = false;
        isVideoMuted = true;
        isAudioMuted = true;
        
        createLocalVideoElement();
        return localStream;
    }
}

// Создание локального видеоэлемента
function createLocalVideoElement() {
    let localVideo = document.getElementById('localVideo');
    if (!localVideo) {
        localVideo = document.createElement('div');
        localVideo.id = 'localVideo';
        localVideo.className = 'video-element local-video';
        videoContainer.appendChild(localVideo);
    }

    if (hasCamera && !isVideoMuted && localStream) {
        const videoElement = document.createElement('video');
        videoElement.autoplay = true;
        videoElement.muted = true;
        videoElement.playsinline = true;
        videoElement.srcObject = localStream;
        
        localVideo.innerHTML = `
            <div class="video-header">Вы</div>
            ${videoElement.outerHTML}
        `;
    } else {
        const statusText = !hasCamera ? 'Нет камеры' : 
                          isVideoMuted ? 'Камера отключена' : 'Нет видео';
        
        localVideo.innerHTML = `
            <div class="video-header">Вы ${isVideoMuted ? '(без видео)' : ''}</div>
            <div class="video-placeholder">${statusText}</div>
        `;
    }
    
    videoContainer.classList.remove('hidden');
}

// Обновление элементов управления
function updateCallControls(useCamera, useMicrophone) {
    // Обновление состояния
    hasCamera = useCamera;
    hasMicrophone = useMicrophone;
    
    // Отображение кнопок в зависимости от возможностей
    toggleCameraButton.classList.toggle('hidden', !hasCamera);
    toggleMicButton.classList.toggle('hidden', !hasMicrophone);
    callControls.classList.remove('hidden');
    
    // Обновление иконок
    updateToggleButtonIcons();
}

// Обновление иконок кнопок
function updateToggleButtonIcons() {
    if (hasCamera) {
        toggleCameraButton.innerHTML = isVideoMuted ? 
            '<i class="iconoir-camera-off"></i>' : 
            '<i class="iconoir-camera"></i>';
    }
    
    if (hasMicrophone) {
        toggleMicButton.innerHTML = isAudioMuted ? 
            '<i class="iconoir-mic-off"></i>' : 
            '<i class="iconoir-mic"></i>';
    }
}

// Переключение камеры
function toggleCamera() {
    if (!localStream || !hasCamera) return;
    
    const videoTracks = localStream.getVideoTracks();
    if (videoTracks.length === 0) return;
    
    const track = videoTracks[0];
    isVideoMuted = !isVideoMuted;
    track.enabled = !isVideoMuted;
    
    // Обновление локального видео
    createLocalVideoElement();
    updateToggleButtonIcons();
}

// Переключение микрофона
function toggleMicrophone() {
    if (!localStream || !hasMicrophone) return;
    
    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length === 0) return;
    
    const track = audioTracks[0];
    isAudioMuted = !isAudioMuted;
    track.enabled = !isAudioMuted;
    
    updateToggleButtonIcons();
}

// Создание видеоэлемента для удаленного участника
function createRemoteVideoElement(userId, stream, username) {
    let videoElement = document.getElementById(`remoteVideo-${userId}`);
    
    if (!videoElement) {
        videoElement = document.createElement('div');
        videoElement.id = `remoteVideo-${userId}`;
        videoElement.className = 'video-element';
        videoContainer.appendChild(videoElement);
    }
    
    const hasVideo = stream.getVideoTracks().length > 0;
    const hasAudio = stream.getAudioTracks().length > 0;
    
    if (hasVideo) {
        const video = document.createElement('video');
        video.autoplay = true;
        video.playsinline = true;
        video.srcObject = stream;
        
        videoElement.innerHTML = `
            <div class="video-header">${username || 'Участник'}</div>
            ${video.outerHTML}
            ${!hasAudio ? '<div class="audio-status muted">Без микрофона</div>' : ''}
        `;
    } else {
        const statusText = !hasAudio ? 'Нет аудио и видео' : 'Нет видео';
        const icon = !hasAudio ? '🔇' : '📹';
        
        videoElement.innerHTML = `
            <div class="video-header">${username || 'Участник'} ${!hasVideo ? '(без видео)' : ''}</div>
            <div class="video-placeholder">
                ${icon} ${statusText}
            </div>
            ${hasAudio ? '<div class="audio-status">Только аудио</div>' : ''}
        `;
    }
}

// Очистка ресурсов
function cleanupResources() {
    // Остановка локального потока
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    // Закрытие всех соединений
    Object.values(peerConnections).forEach(pc => {
        try {
            pc.close();
        } catch (e) {
            console.warn('Ошибка закрытия соединения:', e);
        }
    });
    
    // Очистка состояния
    peerConnections = {};
    remoteStreams = {};
    remoteStreams = {};
    
    // Очистка видео контейнера
    videoContainer.innerHTML = '';
    videoContainer.classList.add('hidden');
    
    // Сброс состояния управления
    hasCamera = false;
    hasMicrophone = false;
    isAudioMuted = false;
    isVideoMuted = false;
    
    // Скрытие элементов управления
    callControls.classList.add('hidden');
    toggleCameraButton.classList.add('hidden');
    toggleMicButton.classList.add('hidden');
    
    // Восстановление кнопки создания звонка
    createCallButton.classList.remove('hidden');
    declineCallButton.classList.add('hidden');
}

// Завершение звонка
function endCall() {
    cleanupResources();
    socket.emit('leave_call', { chat_id: chatId });
    notification('Звонок завершен');
}

// Обработка входящего звонка
socket.on('incoming_call', (data) => {
    if (data.chat_id !== chatId) return;
    
    currentCallerId = data.caller_id;
    callerNameElement.textContent = data.caller_name || 'Пользователь';
    
    // Предзаполнение настроек по умолчанию
    incomingUseCamera.checked = true;
    incomingUseMicrophone.checked = true;
    
    incomingCallModal.classList.remove('hidden');
});

// Новый участник присоединился к звонку
socket.on('user_joined_call', async (data) => {
    if (data.chat_id !== chatId || !localStream) return;
    
    await createPeerConnection(data.user_id, data.username);
});

// Участник покинул звонок
socket.on('user_left_call', (data) => {
    if (data.chat_id !== chatId) return;
    
    // Закрытие соединения
    if (peerConnections[data.user_id]) {
        peerConnections[data.user_id].close();
        delete peerConnections[data.user_id];
    }
    
    // Удаление видео
    const videoElement = document.getElementById(`remoteVideo-${data.user_id}`);
    if (videoElement) {
        videoElement.remove();
    }
    
    // Очистка потока
    if (remoteStreams[data.user_id]) {
        remoteStreams[data.user_id].getTracks().forEach(track => track.stop());
        delete remoteStreams[data.user_id];
    }
});

// ... остальной код WebRTC остается без изменений ...
// (webrtc_offer, webrtc_answer, webrtc_ice_candidate, createPeerConnection, handleRemoteTrack)