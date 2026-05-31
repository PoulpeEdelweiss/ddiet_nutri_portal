/**
 * Экранирует HTML-специальные символы для предотвращения XSS-атак
 * @param {string} str - Исходная строка
 * @returns {string} - Экранированная строка, безопасная для вставки в HTML
 */
export function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => 
        m === '&' ? '&amp;' :
        m === '<' ? '&lt;' :
        m === '>' ? '&gt;' :
        m === '"' ? '&quot;' : '&#39;'
    );
}