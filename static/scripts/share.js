document.getElementById('shareButton').addEventListener('click', function() {
    // Проверяем, поддерживает ли браузер API Share
    if (navigator.share) {
      // Для мобильных устройств и браузеров, поддерживающих Share API
      navigator.share({
        title: 'free chat',
        text: 'Приглашение в чат\n',
        url: window.location.href
      })
      .then(() => console.log('Ссылка успешно поделена'))
      .catch((error) => console.log('Ошибка при попытке поделиться', error));
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
      alert('Ссылка скопирована в буфер обмена!');
    }
  });