export function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

export function formatMessage(message) {
    const codeBlockPattern = /```(\w+)?\n?([\s\S]*?)```/g;
    let result = '';
    let lastIndex = 0;
    let match;

    while ((match = codeBlockPattern.exec(message)) !== null) {
        const [full, lang, code] = match;
        const before = message.slice(lastIndex, match.index);
        result += escapeHtml(before).replace(/\n/g, '<br>');
        const langClass = lang ? `language-${lang}` : '';
        const escapedCode = escapeHtml(code);
        result += `<pre><code class="${langClass}">${escapedCode}</code></pre>`;
        lastIndex = match.index + full.length;
    }

    const rest = message.slice(lastIndex);
    result += escapeHtml(rest).replace(/\n/g, '<br>');
    return result;
}