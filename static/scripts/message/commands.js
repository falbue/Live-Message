Replace file with clean implementation for command popup functionality(initialize from DOM, keyboard nav, Enter execution)
        if (!raw.startsWith('/')) return hideCommandPopup();
const parts = raw.split(/\s+/);
const cmd = parts[0].slice(1);
const args = parts.slice(1).join(' ').trim();
if (cmd === 'username') {
    if (!args) {
        server_command('Не задано новое имя. Введите "/username новое_имя"');
        return;
    }
    try {
        localStorage.setItem('username', args);
        server_command(`Имя пользователя установлено: ${args}`);
    } catch (e) {
        server_command('Ошибка при сохранении имени пользователя');
        import { server_command } from './typing.js';

        let commandPopup = null;
        let titleEl = null;
        let descEl = null;
        let listEl = null;
        let actionBtn = null;
        const getUsername = () => localStorage.getItem('username') || '';

        // registry of commands: {name, description, handler(optional)}
        const commands = [
            { name: 'username', description: 'Установить имя пользователя' },
            { name: 'help', description: 'Помощь' }
        ];

        export function registerCommand(cmd) {
            if (!cmd || !cmd.name) return;
            const exists = commands.find(c => c.name === cmd.name);
            if (exists) Object.assign(exists, cmd); else commands.push(cmd);
        }

        function ensurePopup() {
            if (commandPopup) return;
            commandPopup = document.querySelector('.command-inline-popup');
            if (!commandPopup) {
                // fallback: create minimal popup and append to body
                commandPopup = document.createElement('div');
                commandPopup.className = 'command-inline-popup';
                commandPopup.innerHTML = `<div class="command-title"></div><div class="command-desc"></div><div class="command-list"></div><button class="command-action">Выполнить</button>`;
                document.body.appendChild(commandPopup);
                commandPopup.style.position = 'fixed';
            }

            titleEl = commandPopup.querySelector('.command-title');
            descEl = commandPopup.querySelector('.command-desc');
            listEl = commandPopup.querySelector('.command-list');
            actionBtn = commandPopup.querySelector('.command-action');

            let selectedIndex = -1;

            function renderList(items) {
                listEl.innerHTML = '';
                const max = Math.min(items.length, 10);
                for (let i = 0; i < max; i++) {
                    const c = items[i];
                    const item = document.createElement('div');
                    item.className = 'command-item';
                    item.dataset.idx = i;
                    const left = document.createElement('div');
                    left.className = 'cmd-left';
                    const name = document.createElement('div');
                    name.className = 'cmd-name';
                    name.textContent = `/${c.name}`;
                    const d = document.createElement('div');
                    d.className = 'cmd-desc';
                    d.textContent = c.description || '';
                    left.appendChild(name);
                    left.appendChild(d);
                    item.appendChild(left);
                    item.addEventListener('click', () => {
                        const inputMessage = document.getElementById('inputMessage');
                        if (inputMessage) inputMessage.value = `/${c.name} `;
                        hideCommandPopup();
                        if (inputMessage) inputMessage.focus();
                    });
                    listEl.appendChild(item);
                }
                selectedIndex = -1;
            }

            function selectOffset(offset) {
                const items = listEl.querySelectorAll('.command-item');
                if (!items.length) return;
                selectedIndex = Math.max(0, Math.min(items.length - 1, selectedIndex + offset));
                items.forEach((it, idx) => {
                    it.classList.toggle('command-item--selected', idx === selectedIndex);
                });
            }

            function chooseSelected() {
                const items = listEl.querySelectorAll('.command-item');
                if (selectedIndex >= 0 && selectedIndex < items.length) {
                    items[selectedIndex].click();
                }
            }

            function executeCommand(raw) {
                if (!raw || !raw.startsWith('/')) return;
                const parts = raw.split(/\s+/);
                const cmd = parts[0].slice(1);
                const args = parts.slice(1).join(' ').trim();

                if (cmd === 'username') {
                    if (!args) {
                        server_command('Не задано новое имя. Введите "/username новое_имя"');
                        return;
                    }
                    try {
                        localStorage.setItem('username', args);
                        server_command(`Имя пользователя установлено: ${args}`);
                    } catch (e) {
                        server_command('Ошибка при сохранении имени пользователя');
                    }
                    const inputMessage = document.getElementById('inputMessage');
                    if (inputMessage) inputMessage.value = '';
                    hideCommandPopup();
                    return;
                }

                if (cmd === 'help') {
                    server_command('Доступные команды: ' + commands.map(c => `/${c.name} - ${c.description}`).join('; '));
                    hideCommandPopup();
                    return;
                }

                server_command(`Неизвестная команда: /${cmd}`);
                hideCommandPopup();
            }

            // action button
            actionBtn.addEventListener('click', () => {
                const inputMessage = document.getElementById('inputMessage');
                if (!inputMessage) return hideCommandPopup();
                executeCommand(inputMessage.value.trim());
            });

            // keyboard navigation: up/down in list, enter to choose/execute
            function onKey(e) {
                if (!commandPopup || commandPopup.style.display !== 'block') return;
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    selectOffset(1);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    selectOffset(-1);
                } else if (e.key === 'Enter') {
                    const inputMessage = document.getElementById('inputMessage');
                    if (selectedIndex >= 0) {
                        e.preventDefault();
                        chooseSelected();
                    } else if (inputMessage && document.activeElement === inputMessage && !e.shiftKey) {
                        e.preventDefault();
                        executeCommand(inputMessage.value.trim());
                    }
                } else if (e.key === 'Escape') {
                    hideCommandPopup();
                }
            }
            document.addEventListener('keydown', onKey);

            // expose small API on element
            commandPopup._renderList = renderList;
            commandPopup._setTitle = (t) => { if (titleEl) titleEl.textContent = t || ''; };
            commandPopup._setDesc = (t) => { if (descEl) descEl.textContent = t || ''; };
        }

        export function showCommandPopup(raw) {
            ensurePopup();
            const inputMessage = document.getElementById('inputMessage');
            if (!raw || !raw.startsWith('/')) return hideCommandPopup();
            const parts = raw.split(/\s+/);
            const cmdPart = parts[0].slice(1).toLowerCase();
            const args = parts.slice(1).join(' ');

            // filter commands by name/includes
            const filtered = commands.filter(c => c.name && c.name.toLowerCase().includes(cmdPart));
            if (filtered.length) {
                commandPopup._setTitle(cmdPart ? `Команды: /${cmdPart}` : 'Команды');
                commandPopup._setDesc('Нажмите на команду, чтобы подставить её в поле ввода.');
                commandPopup._renderList(filtered);
            } else {
                commandPopup._setTitle(`/${cmdPart}`);
                // specific help for username
                if (cmdPart === 'username' || parts[0].toLowerCase() === '/username') {
                    const cur = getUsername() || '(не задано)';
                    if (!args) commandPopup._setDesc(`Текущее имя: ${cur}. Введите "/username новое_имя" и нажмите "Выполнить"`);
                    else commandPopup._setDesc(`Сменить имя с ${cur} на: ${args}`);
                } else {
                    commandPopup._setDesc('Неизвестная команда');
                }
                commandPopup._renderList([]);
            }

            // position popup near input (inside .input-message if present)
            if (inputMessage && commandPopup.parentElement && commandPopup.parentElement.classList.contains('input-message')) {
                // position above the textarea inside the relative container
                commandPopup.style.left = `${Math.max(8, inputMessage.offsetLeft)}px`;
                commandPopup.style.bottom = `${inputMessage.offsetHeight + 12}px`;
            } else if (inputMessage) {
                const rect = inputMessage.getBoundingClientRect();
                commandPopup.style.left = `${rect.left + window.scrollX}px`;
                commandPopup.style.top = `${rect.top + window.scrollY - rect.height - 12}px`;
            }
            commandPopup.style.display = 'block';
        }

        export function hideCommandPopup() {
            if (!commandPopup) return;
            commandPopup.style.display = 'none';
        }