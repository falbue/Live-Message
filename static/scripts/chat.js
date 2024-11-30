const socket = io();

const inputMessage = document.getElementById('inputMessage');
const displayMessage = document.getElementById('displayMessage');

    // Функция для замены новых строк на <br> теги
function formatMessage(message) {
    return message.replace(/\n/g, '<br>');
}

    // Отправляем сообщение при каждом изменении ввода
inputMessage.addEventListener('input', () => {
    const messageText = inputMessage.value.trim() || 'Ожидание...';
    socket.emit('update_message', { text: messageText });
});

    // Обновляем текстовое сообщение при получении данных
socket.on('receive_message', (data) => {
        displayMessage.innerHTML = formatMessage(data.text); // Используем innerHTML для поддержания <br>
    });