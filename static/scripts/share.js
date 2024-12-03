document.getElementById('shareButton').addEventListener('click', function() {
  // Создаем элемент уведомления
  const notification = document.createElement('div');
  notification.className = 'notification';
  
  // Проверяем, поддерживает ли браузер API Share
  if (navigator.share) {
    // Для мобильных устройств и браузеров, поддерживающих Share API
    navigator.share({
      title: 'free chat',
      text: 'Приглашение в чат\n',
      url: window.location.href
    })
    .then(() => {
      notification.textContent = 'Ссылка скопирована в буфер обмена!';
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.remove();
      }, 3000); // Удаляем уведомление через 3 секунды
    })
    .catch((error) => {
      console.log('Ошибка при попытке поделиться', error);
    });
  } else {
    // Для ПК и браузеров, не поддерживающих Share API
    // Создаем временное текстовое поле для копирования ссылки
    const textarea = document.createElement('textarea');
    textarea.value = window.location.href;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);

    // Уведомление об успешном копировании
    notification.textContent = 'Ссылка скопирована в буфер обмена!';
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.remove();
    }, 3000); // Удаляем уведомление через 3 секунды
  }
});
