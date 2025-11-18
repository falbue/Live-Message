let _socket = null;

function ensureSocket() {
    if (_socket) return _socket;
    try {
        if (typeof io === 'function') {
            _socket = io();
        } else if (typeof window !== 'undefined' && typeof window.io === 'function') {
            _socket = window.io();
        } else {
            _socket = null;
        }
    } catch (e) {
        _socket = null;
    }
    return _socket;
}

const socketClient = {
    get socket() {
        return _socket || ensureSocket();
    },
    emitUpdate: ({ chat_id, text, sender_id }) => {
        const s = ensureSocket();
        if (!s) return;
        s.emit('update_message', { chat_id, text, sender_id });
    },
    onReceive: (cb) => {
        const s = ensureSocket();
        if (!s) return;
        s.on('receive_message', cb);
    },
};

export default socketClient;