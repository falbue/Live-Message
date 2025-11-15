import { server_command } from './typing.js';

(function () {
    const commands = [
        { name: '/help', desc: 'Помощь' },
        { name: '/username', desc: 'Сменить имя пользователя' }
    ];

    const el = {
        commandsWrap: document.querySelector('.commands'),
        list: document.querySelector('.commands .list'),
        input: document.getElementById('inputMessage'),
        resetBtn: document.getElementById('reset'),
        execBtn: document.getElementById('exec'),
    };

    if (!el.input || !el.commandsWrap || !el.list) return;

    let filtered = commands.slice();
    let selected = -1;
    let lastMouseIndex = -1;

    window.LMCommands = {
        add(cmd) {
            if (!cmd || !cmd.name) return;
            commands.push(cmd);
        },
        list() {
            return commands.slice();
        }
    };

    function renderList() {
        el.list.innerHTML = '';
        if (filtered.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'item empty';
            empty.innerHTML = '<p class="desc">Команд не найдено</p>';
            el.list.appendChild(empty);
            return;
        }

        filtered.forEach((cmd, idx) => {
            const item = document.createElement('div');
            item.className = 'item';
            item.tabIndex = 0;
            item.dataset.index = idx;
            item.innerHTML = `\n                <h4 class="name">${escapeHtml(cmd.name)}</h4>\n                <p class="desc">${escapeHtml(cmd.desc || '')}</p>\n            `;
            item.addEventListener('click', () => selectAndInsert(idx));

            item.addEventListener('mouseenter', () => {
                lastMouseIndex = idx;
                selected = idx;
                updateSelection();
            });
            item.addEventListener('mouseleave', () => {
                if (lastMouseIndex === idx) {
                    lastMouseIndex = -1;
                    selected = -1;
                    updateSelection();
                }
            });
            el.list.appendChild(item);
        });
        updateSelection();
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[c]));
    }

    function updateSelection() {
        const items = el.list.querySelectorAll('.item');
        items.forEach(it => it.classList.remove('active'));
        if (selected >= 0 && items[selected]) {
            items[selected].classList.add('active');
            items[selected].scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
    }

    function selectAndInsert(idx) {
        const cmd = filtered[idx];
        if (!cmd) return;
        el.input.value = cmd.name + ' ';
        filterCommands(cmd.name);
        showCommands();
        selected = idx;
        updateSelection();
        el.input.focus();
        try { el.input.selectionStart = el.input.selectionEnd = el.input.value.length; } catch (e) { /* ignore */ }
    }

    function showCommands() {
        el.commandsWrap.classList.remove('hidden');
        el.resetBtn?.classList.add('hidden');
        el.execBtn?.classList.remove('hidden');
    }

    function hideCommands() {
        el.commandsWrap.classList.add('hidden');
        el.resetBtn?.classList.remove('hidden');
        el.execBtn?.classList.add('hidden');
        selected = -1;
    }

    function filterCommands(text) {
        const q = (text || '').trim();
        if (!q || q === '/') {
            filtered = commands.slice();
        } else {
            filtered = commands.filter(c => c.name.startsWith(q) || c.name.includes(q));
        }
        selected = filtered.length ? 0 : -1;
        renderList();
    }

    // Сами команды
    const handlers = {
        '/help': () => {
            const lines = commands.map(c => `${c.name} — ${c.desc || ''}`).join('\n');
            server_command(lines);
        },
        '/username': () => {
            // Прочитать введённую строку и взять всё, что идёт после команды
            const raw = (el.input && el.input.value) ? el.input.value.trim() : '';
            const parts = raw.split(/\s+/);
            const name = parts.slice(1).join(' ').trim();
            if (!name) {
                const msg = 'Укажите имя пользователя после команды, например: /username Иван';
                notification(msg);
                server_command(msg, 10);
                return;
            }
            try {
                localStorage.setItem('username', name);
                const msg = `Имя пользователя установлено: ${name}`;
                server_command(msg);
                notification(msg);
                if (el.input) el.input.value = '';
            } catch (e) {
                console.error(e);
                const err = 'Не удалось сохранить имя пользователя';
                notification(err);
                server_command(err);
            }
        }
    };

    function executeCurrent() {
        const value = (el.input.value || '').trim();
        const token = value.split(/\s+/)[0] || '';
        if (!token.startsWith('/')) return false;
        const handler = handlers[token];
        if (handler) {
            try {
                handler();
            } catch (e) {
                console.error(e);
                notification('Ошибка при выполнении команды');
            }
            el.input.value = '';
            hideCommands();
            return true;
        } else {
            notification('Неизвестная команда: ' + token);
            return false;
        }
    }

    el.input.addEventListener('input', () => {
        const v = el.input.value || '';
        if (v.startsWith('/')) {
            filterCommands(v.split(/\s+/)[0]);
            showCommands();
        } else {
            hideCommands();
        }
    });

    el.input.addEventListener('keydown', (ev) => {
        if (el.commandsWrap.classList.contains('hidden')) return;

        if (ev.key === 'ArrowDown') {
            ev.preventDefault();
            if (filtered.length === 0) return;
            selected = Math.min(filtered.length - 1, Math.max(0, selected + 1));
            updateSelection();
            return;
        }
        if (ev.key === 'Tab') {
            ev.preventDefault();
            if (filtered.length === 0) return;
            if (selected >= 0 && filtered[selected]) {
                const cmdName = filtered[selected].name;
                el.input.value = cmdName + ' ';
                filterCommands(cmdName);
                showCommands();
                el.input.focus();
                try { el.input.selectionStart = el.input.selectionEnd = el.input.value.length; } catch (e) { /* ignore */ }
            }
            return;
        }
        if (ev.key === 'ArrowUp') {
            ev.preventDefault();
            if (filtered.length === 0) return;
            selected = Math.max(0, selected - 1);
            updateSelection();
            return;
        }
        if (ev.key === 'Enter') {
            ev.preventDefault();
            executeCurrent();
            return;
        }
    });

    el.execBtn?.addEventListener('click', (ev) => {
        ev.preventDefault();
        executeCurrent();
    });

    // Initialize render
    filterCommands('/');

})();
