let commands = [];

let _readyResolve = null;
export const ready = new Promise((res) => { _readyResolve = res; });

function _resolveReady() {
    if (_readyResolve) {
        _readyResolve(commands);
        _readyResolve = null;
    }
}

export function register(cmd) {
    if (!cmd) return;
    if (Array.isArray(cmd)) commands.push(...cmd);
    else commands.push(cmd);
    _resolveReady();
}

export function getCommands() {
    return commands;
}

function fillCommandsFromArray(arr) {
    if (!Array.isArray(arr)) return;
    commands.length = 0;
    commands.push(...arr);
    _resolveReady();
}

if (typeof import.meta !== 'undefined' && typeof import.meta.globEager === 'function') {
    const modules = import.meta.globEager('./*.js');
    const found = Object.keys(modules)
        .filter(k => k !== './index.js')
        .map(k => modules[k].default || modules[k]);
    fillCommandsFromArray(found);

} else if (typeof require === 'function' && typeof require.context === 'function') {
    const ctx = require.context('./', false, /\.js$/);
    const found = ctx.keys()
        .filter(k => k !== './index.js')
        .map(k => {
            const m = ctx(k);
            return m && (m.default || m);
        });
    fillCommandsFromArray(found);

} else {
    // If window.LIFEMESSAGE_COMMANDS already set — use it. Otherwise wait a short time
    if (typeof window !== 'undefined' && Array.isArray(window.LIFEMESSAGE_COMMANDS)) {
        fillCommandsFromArray(window.LIFEMESSAGE_COMMANDS);
        console.info('[commands/index.js] Loaded commands from window.LIFEMESSAGE_COMMANDS');
    } else {
        // give a small grace period for pages that register commands right after import
        setTimeout(() => {
            if (commands.length > 0) return; // already filled
            if (typeof window !== 'undefined' && Array.isArray(window.LIFEMESSAGE_COMMANDS)) {
                fillCommandsFromArray(window.LIFEMESSAGE_COMMANDS);
                console.info('[commands/index.js] Loaded commands from window.LIFEMESSAGE_COMMANDS (delayed)');
                return;
            }
            console.warn('[commands/index.js] Automatic import is not available in this environment.');
            console.warn('Provide commands by setting `window.LIFEMESSAGE_COMMANDS = [module1, ...]` before importing this file,');
            console.warn('or import `register` and call `register(module)` for each command.');
        }, 80);
    }
}

export default commands;