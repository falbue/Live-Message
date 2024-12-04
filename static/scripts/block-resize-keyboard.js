document.addEventListener('touchmove', function(event) {
        event.preventDefault();
    }, { passive: false });


    const viewportInfo = document.getElementById('viewport-info');

    function updateViewportInfo() {
            // Получаем текущие значения для высоты viewport и body
        const visualHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const bodyHeight = document.body.offsetHeight;

            // Обновляем текст в левом верхнем углу
        viewportInfo.textContent = `Viewport Height: ${visualHeight}px, Body Height: ${bodyHeight}px`;

            // Синхронизируем высоту body с высотой viewport
        document.body.style.height = `${visualHeight}px`;

    }

    if (window.visualViewport) {
            // Слушаем изменения visualViewport
        window.visualViewport.addEventListener('resize', updateViewportInfo);
        window.visualViewport.addEventListener('scroll', updateViewportInfo);
    } else {
            // Фолбэк для старых браузеров
        window.addEventListener('resize', updateViewportInfo);
    }

        // Инициализация
    updateViewportInfo();