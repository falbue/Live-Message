document.getElementById('shareButton').addEventListener('click', function() {
  const notification = document.createElement('div');
  notification.className = 'notification';
  
  if (navigator.share) {
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
      }, 3000);
    })
    .catch((error) => {
      console.log('Ошибка при попытке поделиться', error);
    });
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = window.location.href;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
ы
    notification.textContent = 'Ссылка скопирована в буфер обмена!';
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
});
