// Логика работы с прикреплениями (зависит от глобальных переменных: socket, chatId, senderId)
document.addEventListener('DOMContentLoaded', () => {
    const attachButton = document.getElementById("attachButton");
    const fileInput = document.getElementById("fileInput");
    const attachmentsContainer = document.getElementById("attachments");

    let attachments = []; // локальные прикрепления пользователя

    // Обработка входящих прикреплённых файлов от других пользователей
    socket.on("receive_attachments", (data) => {
        // ожидаем, что сервер пересылает { chat_id, sender_id, attachments: [...] }
        const sender = data.sender_id;

        // Найдём уже отрисованный контейнер от этого отправителя (если был)
        const chat = document.querySelector('.chat');
        if (!chat) return;

        const existing = chat.querySelector(`.received-attachments[data-sender="${sender}"]`);

        // Если нет прикреплений — удалить существующий контейнер (если есть)
        if (!data.attachments || !data.attachments.length) {
            if (existing) existing.remove();
            return;
        }

        // Создадим новый контейнер
        const container = document.createElement("div");
        container.className = "received-attachments";
        container.dataset.sender = sender;

        data.attachments.forEach((a) => {
            const item = document.createElement("div");
            item.className = "attachment received";

            if (a.type && a.type.startsWith("image/")) {
                const img = document.createElement("img");
                img.src = a.dataUrl;
                img.alt = a.name;
                img.className = "attachment-preview";
                item.appendChild(img);
            }

            const info = document.createElement("div");
            info.className = "attachment-info";
            info.innerHTML = `<div class=\"attachment-name\">${a.name}</div><div class=\"attachment-size\">${Math.round(a.size / 1024)} KB</div>`;
            item.appendChild(info);

            const link = document.createElement("a");
            link.href = a.dataUrl;
            link.download = a.name;
            link.className = "button";

            const icon = document.createElement("i");
            icon.className = "iconoir-download";
            link.appendChild(icon);

            item.appendChild(link);

            container.appendChild(item);
        });

        // Если уже есть — заменим, иначе добавим
        if (existing) {
            existing.replaceWith(container);
        } else {
            chat.appendChild(container);
        }
    });

    function renderAttachments() {
        if (!attachmentsContainer) return;
        attachmentsContainer.innerHTML = "";
        attachments.forEach((att) => {
            const el = document.createElement("div");
            el.className = "attachment";
            el.dataset.id = att.id;

            if (att.type && att.type.startsWith("image/")) {
                const img = document.createElement("img");
                img.src = att.dataUrl;
                img.alt = att.name;
                img.className = "attachment-preview";
                el.appendChild(img);
            } else {
                const icon = document.createElement("i");
                icon.className = "iconoir-attachment";
                icon.style.fontSize = '1.1rem';
                el.appendChild(icon);
            }

            const meta = document.createElement("div");
            meta.className = "attachment-meta";
            meta.innerHTML = `<div class=\"attachment-name\">${att.name}</div><div class=\"attachment-size\">${Math.round(att.size / 1024)} KB</div>`;
            el.appendChild(meta);

            const removeBtn = document.createElement("button");
            removeBtn.type = 'button';
            removeBtn.className = 'attachment-remove';
            removeBtn.title = 'Удалить файл';
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', () => {
                removeAttachment(att.id);
            });
            el.appendChild(removeBtn);

            attachmentsContainer.appendChild(el);
        });
    }

    function emitAttachmentsUpdate() {
        const payload = attachments.map((a) => ({ id: a.id, name: a.name, size: a.size, type: a.type, dataUrl: a.dataUrl }));
        socket.emit('update_attachments', { chat_id: chatId, sender_id: senderId, attachments: payload });
    }

    function removeAttachment(id) {
        attachments = attachments.filter((a) => a.id !== id);
        renderAttachments();
        emitAttachmentsUpdate();
    }

    function handleFiles(fileList) {
        const files = Array.from(fileList);
        const readers = files.map((file) => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
                    const att = { id, name: file.name, size: file.size, type: file.type, dataUrl: e.target.result };
                    attachments.push(att);
                    resolve(att);
                };
                reader.readAsDataURL(file);
            });
        });

        Promise.all(readers).then(() => {
            renderAttachments();
            emitAttachmentsUpdate();
        });
    }

    // Кнопка прикрепления
    attachButton?.addEventListener('click', () => {
        fileInput?.click();
    });

    fileInput?.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) {
            handleFiles(e.target.files);
            e.target.value = null;
        }
    });

    // Drag & drop на области ввода
    const textareaWrapper = document.querySelector('.textarea-wrapper');
    if (textareaWrapper) {
        ['dragenter', 'dragover'].forEach((ev) => {
            textareaWrapper.addEventListener(ev, (e) => {
                e.preventDefault();
                e.stopPropagation();
                textareaWrapper.classList.add('drag-over');
            });
        });
        ['dragleave', 'drop'].forEach((ev) => {
            textareaWrapper.addEventListener(ev, (e) => {
                e.preventDefault();
                e.stopPropagation();
                textareaWrapper.classList.remove('drag-over');
            });
        });

        textareaWrapper.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            if (dt && dt.files && dt.files.length) {
                handleFiles(dt.files);
            }
        });
    }
});
