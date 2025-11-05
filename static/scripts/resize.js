document.addEventListener('DOMContentLoaded', () => {
    const textarea = document.getElementById('inputMessage');
    const handle = document.querySelector('.resize-handle');

    let startY;
    let startHeight;

    // Минимальная высота textarea (изначальный размер)
    const initialHeight = textarea.offsetHeight;

    // Максимальная высота — 40% экрана
    const maxResizeHeight = window.innerHeight * 0.4; // 40% высоты экрана

    // Функции для мыши
    function startDrag(e) {
        startY = e.clientY || e.touches?.[0].clientY;
        startHeight = parseInt(document.defaultView.getComputedStyle(textarea).height, 10);

        document.documentElement.addEventListener('mousemove', doDrag, false);
        document.documentElement.addEventListener('mouseup', stopDrag, false);

        // Добавляем touch-события
        document.documentElement.addEventListener('touchmove', doDrag, { passive: false });
        document.documentElement.addEventListener('touchend', stopDrag, false);
    }

    function doDrag(e) {
        e.preventDefault(); // предотвращаем прокрутку при перетаскивании
        const clientY = e.clientY || e.touches?.[0].clientY;
        const newHeight = startHeight - (clientY - startY);

        if (newHeight >= initialHeight && newHeight <= maxResizeHeight) {
            textarea.style.height = `${newHeight}px`;
        }
    }

    function stopDrag() {
        document.documentElement.removeEventListener('mousemove', doDrag, false);
        document.documentElement.removeEventListener('mouseup', stopDrag, false);
        document.documentElement.removeEventListener('touchmove', doDrag, false);
        document.documentElement.removeEventListener('touchend', stopDrag, false);
    }

    // Назначаем оба события: мышь и тач
    handle.addEventListener('mousedown', startDrag);
    handle.addEventListener('touchstart', startDrag, { passive: false });

    // Автоувеличение высоты при вводе
    textarea.addEventListener('input', autoResize);

    function autoResize() {
        if (parseInt(textarea.style.height, 10) < maxResizeHeight) {
            textarea.style.height = 'auto';
            const newHeight = Math.min(textarea.scrollHeight, maxResizeHeight);
            textarea.style.height = `${newHeight}px`;
        }
    }

    // Инициализация высоты
    autoResize();
});