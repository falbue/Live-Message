export function createSocket() {
    const socket = io();
    return {
        socket,
        emitUpdate: ({ chat_id, text, sender_id }) => socket.emit('update_message', { chat_id, text, sender_id }),
        onReceive: (cb) => socket.on('receive_message', cb),
    };
}