import socketClient from '../socket-client.js';

const socket = socketClient.socket;
let joined = false;
let currentCount = 0;

const audioBtn = document.getElementById('audioCallButton');
const acceptBtn = document.getElementById('acceptCall');
const declineBtn = document.getElementById('declineCall');
const copyTitle = document.querySelector('h3.inline.copy');

function updateUI() {
    if (joined) {
        audioBtn.classList.add('active');
        audioBtn.title = 'Выйти из звонка';
        audioBtn.innerHTML = '<i class="iconoir-phone-disabled"></i>';
    } else {
        audioBtn.classList.remove('active');
        audioBtn.title = 'Войти в звонок';
        audioBtn.innerHTML = '<i class="iconoir-phone"></i>';
    }
    if (copyTitle) copyTitle.textContent = joined ? `В звонке (${currentCount})` : '';
}

function joinCall() {
    if (!socket) return;
    const chat_id = window.CHAT_ID;
    if (!chat_id) return;
    socket.emit('join_call', { chat_id });
}

function leaveCall() {
    if (!socket) return;
    const chat_id = window.CHAT_ID;
    if (!chat_id) return;
    socket.emit('leave_call', { chat_id });
}

if (audioBtn) {
    audioBtn.addEventListener('click', () => {
        if (!joined) joinCall();
        else leaveCall();
    });
}

// server events
if (socket) {
    socket.on('call_full', (data) => {
        // show brief notification
        console.warn('Call full', data);
        alert('В комнате звонка уже 12 участников — место занято.');
    });

    socket.on('call_joined', (data) => {
        joined = true;
        currentCount = data.count || currentCount;
        updateUI();
    });

    socket.on('participant_joined', (data) => {
        currentCount = data.count || currentCount;
        updateUI();
    });

    socket.on('call_left', (data) => {
        currentCount = data.count || 0;
        // if this client left, server would also notify others; ensure joined stays accurate
        if (joined && data && data.chat_id === window.CHAT_ID && currentCount === 0) {
            joined = false;
        }
        updateUI();
    });

    // Handle explicit leave acknowledgement for this client (optional)
    socket.on('call_left_ack', (data) => {
        if (data && data.chat_id === window.CHAT_ID) {
            joined = false;
            currentCount = data.count || 0;
            updateUI();
        }
    });
}

// Initialize UI on load
updateUI();
