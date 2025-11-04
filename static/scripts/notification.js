function notification(message, isError = false) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    
    notification.className = 'notification show';
    
    if (isError) {
        notification.classList.add('error');
        setTimeout(() => {
            notification.className = 'notification error';
        }, 3000);
    }

    else{

        setTimeout(() => {
            notification.className = 'notification';
        }, 3000);
    }
}