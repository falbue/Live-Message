document.addEventListener('DOMContentLoaded', function() {
    const links = document.querySelectorAll('[open-menu]');
    const overlay = document.getElementById('overlay');
    const close = document.getElementById('close-hotbar');
    const close_right = document.getElementById('close-right');
    const sidebarButtons = document.querySelectorAll('[open-sidebar]');
    const sidebarClsoe = document.querySelectorAll('[close-sidebar]');
    const sidebars = document.querySelectorAll('.sidebar'); // Поиск всех сайдбаров по классу

    function showElement(element) {
        element.classList.add('show');
        element.classList.remove('close');
    }

    function hideElement(element) {
        element.classList.add('close');
        element.classList.remove('show');
    }

    function hideAllMenus() {
        document.querySelectorAll('.menu').forEach(m => hideElement(m));
    }
    function hideAllSidebars() {
        sidebars.forEach(m => hideElement(m));
    }

    // Логика для меню
    links.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const menuId = this.getAttribute('open-menu');
            const menu = document.getElementById(menuId);

            hideAllMenus(); // Скрыть все меню и сайдбары

            showElement(overlay); // Показать оверлей
            showElement(menu);    // Показать выбранное меню
        });
    });

    // Логика для сайдбаров
    sidebarButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            event.preventDefault();
            const sidebarId = this.getAttribute('open-sidebar');
        const sidebar = document.querySelector(`.sidebar#${sidebarId}`); // Поиск конкретного сайдбара по классу и ID
        
        if (sidebar.id === "sidebar_mood") {
            const buttons = document.querySelectorAll('.button-side');
            buttons.forEach(button => {
                hideElement(button); // Скрыть каждый элемент
                hideAllSidebars();
            });
        }
        showElement(sidebar); // Показать выбранный сайдбар
    });
    });


    sidebarClsoe.forEach(button => {
        button.addEventListener('click', function(event) {
            event.preventDefault();
            const sidebarId = this.getAttribute('close-sidebar');
            const sidebar = document.querySelector(`.sidebar#${sidebarId}`); // Поиск конкретного сайдбара по классу и ID
            hideElement(sidebar);
            if (sidebar.id === "sidebar_mood") {
            const buttons = document.querySelectorAll('.button-side');
            buttons.forEach(button => {
                showElement(button); // Скрыть каждый элемент
            });
        }
        });
    });

    overlay.addEventListener('click', function() {
        hideElement(overlay); // Скрыть оверлей
        hideAllMenus();       // Скрыть все меню и сайдбары
        console.log("Работает");
    });
});
