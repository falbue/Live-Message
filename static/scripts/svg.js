document.addEventListener("DOMContentLoaded", () => {
    const customElements = document.querySelectorAll('EnterSvg');

    customElements.forEach(element => {
        // Сохранение атрибутов элемента
        const attributes = Array.from(element.attributes).map(attr => ({
            name: attr.name,
            value: attr.value
        }));

        const svgName = element.getAttribute('name');
        if (svgName) {
            fetch(`/static/icons/${svgName}.svg`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('SVG file not found');
                    }
                    return response.text();
                })
                .then(svgContent => {
                    // Создание временного элемента для извлечения содержимого SVG
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = svgContent;
                    const svgElement = tempDiv.querySelector('svg');

                    // Проверка наличия SVG элемента в загруженном содержимом
                    if (svgElement) {
                        // Перенос атрибутов с кастомного элемента на SVG элемент
                        attributes.forEach(attr => {
                            svgElement.setAttribute(attr.name, attr.value);
                        });

                        // Замена кастомного тега на обновленный SVG
                        element.outerHTML = svgElement.outerHTML;
                    } else {
                        console.error('No SVG element found in the fetched SVG content');
                    }
                })
                .catch(error => {
                    console.error('Error loading SVG:', error);
                });
        }
    });
});
