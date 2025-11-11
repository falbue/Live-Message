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
    const inlineCodePattern = /`([\s\S]+?)`/g;
    function formatSegmentWithInlineCode(segment) {
        let out = '';
        let li = 0;
        let m;
        while ((m = inlineCodePattern.exec(segment)) !== null) {
            const beforeSeg = segment.slice(li, m.index);
            out += escapeHtml(beforeSeg).replace(/\n/g, '<br>');
            const codeContent = m[1];
            const escapedCode = escapeHtml(codeContent).replace(/\n/g, '<br>');
            out += `<i class="inline">${escapedCode}</i>`;
            li = m.index + m[0].length;
        }
        const restSeg = segment.slice(li);
        out += escapeHtml(restSeg).replace(/\n/g, '<br>');
        return out;
    }

    while ((match = codeBlockPattern.exec(message)) !== null) {
        const [full, lang, code] = match;
        const before = message.slice(lastIndex, match.index);
        result += formatSegmentWithInlineCode(before);
        const langClass = lang ? `language-${lang}` : '';
        const escapedCode = escapeHtml(code);
        result += `<pre><code class="${langClass}">${escapedCode}</code></pre>`;
        lastIndex = match.index + full.length;
    }

    const rest = message.slice(lastIndex);
    result += formatSegmentWithInlineCode(rest);
    return result;
}