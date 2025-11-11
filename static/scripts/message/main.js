import { formatMessage } from './helpers.js';
import { createSocket } from '../socket-client.js';
import { typeText } from './typing.js';

const chatId = window.location.pathname.split('/').pop();
const inputMessage = document.getElementById('inputMessage');
const displayMessage = document.getElementById('displayMessage');
const senderId = Math.random().toString(36).substr(2, 9);

const sc = createSocket();
sc.emitUpdate({ chat_id: chatId, text: 'Пользователь подключился!', sender_id: senderId });

inputMessage?.addEventListener('input', () => {
    const messageText = inputMessage.value.trim() || '...';
    sc.emitUpdate({ chat_id: chatId, text: messageText, sender_id: senderId });
});

sc.onReceive((data) => {
    if (data.sender_id === senderId) return;
    if (!displayMessage) return;
    displayMessage.innerHTML = formatMessage(data.text);
    const codeBlocks = displayMessage.querySelectorAll('pre code');
    if (window.hljs && codeBlocks.length) {
        codeBlocks.forEach((block) => {
            try { hljs.highlightElement(block); } catch (e) { /* ignore */ }
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    typeText('displayMessage', 'Ожидание пользователя...');
});