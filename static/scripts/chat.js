const socket = io();
const chatId = window.location.pathname.split('/').pop(); // Получаем chat_id из URL

const inputMessage = document.getElementById('inputMessage');
const displayMessage = document.getElementById('displayMessage');

// Уникальный ID пользователя (можно генерировать на клиенте или получать с сервера)
const senderId = Math.random().toString(36).substr(2, 9); // Генерация уникального идентификатора

// Функция для замены новых строк на <br> теги
function formatMessage(message) {
    return message.replace(/\n/g, '<br>');
}

// Соединяемся с соответствующей комнатой
socket.emit('join_chat', { chat_id: chatId });

// Отправляем сообщение при каждом изменении ввода
inputMessage.addEventListener('input', () => {
    const messageText = inputMessage.value.trim() || 'Ожидание...';
    socket.emit('update_message', { chat_id: chatId, text: messageText, sender_id: senderId });
});

// Обновляем текстовое сообщение при получении данных
socket.on('receive_message', (data) => {
    // Не заменяем сообщение, если оно было отправлено тем же пользователем
    if (data.sender_id !== senderId) {
        displayMessage.innerHTML = formatMessage(data.text); // Используем innerHTML для поддержания <br>
    }
});
