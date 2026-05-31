import { escapeHtml } from '../utils/sanitization.js';

/**
 * Рендеринг карточек продуктов в DOM-контейнер
 * @param {Array} products - массив продуктов из API Open Food Facts
 * @param {HTMLElement} container - целевой DOM-элемент
 */
export function renderProducts(products, container) {
    if (!container || !document.body.contains(container)) return;
    
    let html = '<div class="results-grid">';
    
    for (const prod of products) {
        const title = (prod.product_name_ru?.trim()) || prod.product_name || 'Без названия';
        const brand = prod.brands?.trim() || 'Бренд не указан';
        const quantity = prod.quantity?.trim() || '—';
        const imgUrl = prod.image_url || prod.image_front_small_url || null;
        const n = prod.nutriments || {};
        
        const kcal = n['energy-kcal'] !== undefined ? Math.round(n['energy-kcal']) : null;
        const proteins = n['proteins'] !== undefined ? parseFloat(n['proteins']).toFixed(1) : null;
        const fat = n['fat'] !== undefined ? parseFloat(n['fat']).toFixed(1) : null;
        const carbs = n['carbohydrates'] !== undefined ? parseFloat(n['carbohydrates']).toFixed(1) : null;
        
        const imageHtml = imgUrl 
            ? `<img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(title)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'image-placeholder\\'>🥫</div>';">`
            : `<div class="image-placeholder">🍽️</div>`;
        
        let nutritionHtml = '';
        if (kcal !== null || proteins !== null || fat !== null || carbs !== null) {
            nutritionHtml = `
                <div class="nutrition-block">
                    ${kcal !== null ? `<div class="nutri-item"><span class="nutri-label">🔥 Ккал</span><span class="nutri-value">${kcal}</span></div>` : ''}
                    ${proteins !== null ? `<div class="nutri-item"><span class="nutri-label">🥩 Белки</span><span class="nutri-value">${proteins} г</span></div>` : ''}
                    ${fat !== null ? `<div class="nutri-item"><span class="nutri-label">🧈 Жиры</span><span class="nutri-value">${fat} г</span></div>` : ''}
                    ${carbs !== null ? `<div class="nutri-item"><span class="nutri-label">🍚 Углеводы</span><span class="nutri-value">${carbs} г</span></div>` : ''}
                </div>
            `;
        } else {
            nutritionHtml = `<div class="nutrition-block"><div class="no-nutri">Нет данных о КБЖУ</div></div>`;
        }
        
        html += `
            <div class="product-card">
                <div class="product-image">${imageHtml}</div>
                <div class="product-info">
                    <div class="product-title">${escapeHtml(title)}</div>
                    <div class="brand">🏷️ ${escapeHtml(brand)}</div>
                    <div class="quantity">📦 ${escapeHtml(quantity)}</div>
                    ${nutritionHtml}
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

/**
 * Валидация поискового запроса
 * @param {string} query - пользовательский ввод
 * @returns {{valid: boolean, error?: string}}
 */
export function validateSearchInput(query) {
    const trimmed = query?.trim();
    if (!trimmed) return { valid: false, error: 'Введите название продукта' };
    if (trimmed.length < 2) return { valid: false, error: 'Запрос слишком короткий' };
    return { valid: true };
}

/**
 * Формирование URL для API Open Food Facts
 * @param {string} query - поисковый запрос
 * @param {number} pageSize - количество результатов
 * @returns {string}
 */
export function buildSearchUrl(query, pageSize = 20) {
    const encoded = encodeURIComponent(query.trim());
    return `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encoded}&search_simple=1&action=process&json=1&lc=ru&page_size=${pageSize}`;
}

/**
 * Фильтрация валидных продуктов из ответа API
 * @param {Array} products - сырой массив из API
 * @returns {Array} - отфильтрованный массив
 */
export function filterValidProducts(products) {
    if (!Array.isArray(products)) return [];
    return products.filter(p => p && (p.product_name || p.product_name_ru));
}