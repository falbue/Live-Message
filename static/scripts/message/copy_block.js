(function () {
    'use strict';

    function copy(text) {
        return navigator.clipboard.writeText(text);
    }

    function findPre(node) {
        while (node) {
            if (node.nodeType === 1 && node.matches && node.matches('pre')) return node;
            node = node.parentNode;
        }
    }

    function handleEvent(e) {
        var pre = findPre(e.target);
        if (!pre) return;
        e.preventDefault();
        var code = pre.querySelector('code');
        var text = (code ? code.innerText : pre.innerText || '').trim();
        if (!text) return;
        copy(text);
        notification('Скопировано');
    }

    document.addEventListener('click', handleEvent, true);
    document.addEventListener('touchend', handleEvent, true);

})();