const socket = io();
const chatId = window.location.pathname.split('/').pop(); // Получаем chat_id из URL
const inputMessage = document.getElementById('inputMessage');
const displayMessage = document.getElementById('displayMessage');
const senderId = Math.random().toString(36).substr(2, 9); // Генерация уникального идентификатора

// Функция для замены новых строк на <br> теги
function formatMessage(message) {
    return message.replace(/\n/g, '<br>');
}

// Соединяемся с соответствующей комнатой и отправляем сообщение о подключении
socket.emit('join_chat', { chat_id: chatId, sender_id: senderId });

// Отправляем сообщение при каждом изменении ввода
inputMessage.addEventListener('input', () => {
    const messageText = inputMessage.value.trim() || '...';
    socket.emit('update_message', { chat_id: chatId, text: messageText, sender_id: senderId });
});

// Обновляем текстовое сообщение при получении данных
socket.on('receive_message', (data) => {
    // Не заменяем сообщение, если оно было отправлено тем же пользователем
    if (data.sender_id !== senderId) {
        displayMessage.innerHTML = formatMessage(data.text); // Используем innerHTML для поддержания <br>
    }
});
