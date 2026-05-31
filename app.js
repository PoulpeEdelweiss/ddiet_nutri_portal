
// app.js — Точка входа приложения
import { escapeHtml } from './src/utils/sanitization.js';
import { 
    calculateBMR, 
    calculateTDEE, 
    calculateMacros, 
    generateGoalResults, 
    validateCalculatorInput 
} from './src/logic/calculator.js';
import { 
    renderProducts, 
    validateSearchInput, 
    buildSearchUrl, 
    filterValidProducts 
} from './src/logic/search.js';

// Динамическая маршрутизация блоков
const contentDiv = document.getElementById('app-content');
const navBtns = document.querySelectorAll('.nav-btn');
let currentBlock = null;

// Глобальный контекст для отмены активного поиска
let searchContext = {
    controller: null,
    active: false
};

function abortPendingSearch() {
    if (searchContext.controller) {
        searchContext.controller.abort();
        searchContext.controller = null;
    }
    searchContext.active = false;
}

async function loadBlock(blockName) {
    if (currentBlock === blockName) {
        console.log(`Блок ${blockName} уже загружен, пропускаем`);
        return;
    }
    abortPendingSearch();

    contentDiv.innerHTML = `<div class="loading-placeholder"><div class="spinner"></div><p>Загрузка раздела...</p></div>`;
    
    try {
        const response = await fetch(`blocks/${blockName}.html`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        let html = await response.text();
        contentDiv.innerHTML = html;
        currentBlock = blockName;
        
        if (blockName === 'search') {
            initSearchModule();
        } else if (blockName === 'calculator') {
            initCalculatorModule();
        }
    } catch (error) {
        console.error(error);
        contentDiv.innerHTML = `<div class="message error-text">Ошибка загрузки блока. Проверьте соединение или перезагрузите страницу.</div>`;
        currentBlock = null;
    }
}

// ------ Модуль ПОИСКА ------
function initSearchModule() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const loader = document.getElementById('searchLoader');
    const resultsDiv = document.getElementById('productResults');
    
    if (!searchBtn) return;

    let currentAbortController = null;
    let currentSearchId = 0;

    function showLoader(show) {
        if (loader) loader.style.display = show ? 'flex' : 'none';
    }

    function showMessage(text, isError = false) {
        if (!resultsDiv) return;
        resultsDiv.innerHTML = `<div class="message" style="${isError ? 'background:#fee2e2; color:#b91c1c' : 'background:#eef2ff; color:#1e3a8a'}">${escapeHtml(text)}</div>`;
    }

    async function performSearch() {
        const query = searchInput.value.trim();
        const validation = validateSearchInput(query);
        if (!validation.valid) {
            showMessage(validation.error);
            return;
        }

        if (currentAbortController) {
            currentAbortController.abort();
        }

        const searchId = ++currentSearchId;
        currentAbortController = new AbortController();
        const { signal } = currentAbortController;

        showLoader(true);
        if (resultsDiv) resultsDiv.innerHTML = '';

        const url = buildSearchUrl(query);

        let attempt = 0;
        const maxAttempts = 3;
        let success = false;
        let lastError = null;

        while (attempt < maxAttempts && !success && searchId === currentSearchId) {
            attempt++;
            try {
                if (attempt > 1) {
                    const delay = Math.min(1000 * Math.pow(2, attempt - 2), 5000);
                    await new Promise(r => setTimeout(r, delay));
                    if (searchId !== currentSearchId) return;
                }

                const response = await fetch(url, {
                    signal,
                    headers: {
                        'User-Agent': 'NutriPortal-App/1.0',
                        'Accept': 'application/json'
                    },
                    cache: 'no-cache'
                });

                if (!response.ok) {
                    if (response.status === 503 || response.status === 429) {
                        throw new Error(`Server busy (${response.status})`);
                    }
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                if (searchId !== currentSearchId) return;

                const products = filterValidProducts(data?.products || []);

                if (!resultsDiv || !document.body.contains(resultsDiv)) return;

                if (products.length === 0) {
                    showMessage('Ничего не найдено');
                } else {
                    renderProducts(products, resultsDiv);
                }
                success = true;
            } catch (err) {
                if (err.name === 'AbortError') return;
                lastError = err;
                console.warn(`Попытка ${attempt} не удалась:`, err.message);
                if (searchId !== currentSearchId) return;
            }
        }

        if (searchId === currentSearchId) {
            showLoader(false);
            if (!success && lastError) {
                let msg = 'Не удалось загрузить данные. Проверьте соединение.';
                if (lastError.message.includes('503') || lastError.message.includes('429')) {
                    msg = 'Сервер временно перегружен. Попробуйте через минуту.';
                }
                showMessage(msg, true);
            }
        }
    }

    searchBtn.addEventListener('click', performSearch);
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }
}

// ------ Модуль КАЛЬКУЛЯТОРА ------
function initCalculatorModule() {
    const calcBtn = document.getElementById('calcBtn');
    const ageInput = document.getElementById('age');
    const weightInput = document.getElementById('weight');
    const heightInput = document.getElementById('height');
    const genderRadios = document.querySelectorAll('input[name="gender"]');
    const formulaSelect = document.getElementById('formulaSelect');
    const activitySelect = document.getElementById('activity');
    const resultsDiv = document.getElementById('kcalResults');
    const errorSpan = document.getElementById('calcError');
    
    if (!calcBtn) return;
    
    function getGender() { 
        for (let r of genderRadios) if (r.checked) return r.value; 
        return 'male'; 
    }
    
    function getActivityFactor() { 
        return parseFloat(activitySelect.value); 
    }
    
    function renderKcalResults(tdee, weight) {
        const results = generateGoalResults(tdee, weight);
        resultsDiv.innerHTML = results.map(r => `
            <div class="kcal-card">
                <h4>${r.label}</h4>
                <div class="kcal-value">${r.kcal} ккал/сутки</div>
                <div class="macro-row"><span>🥩 Белки</span><span>${r.macros.protein} г</span></div>
                <div class="macro-row"><span>🧈 Жиры</span><span>${r.macros.fat} г</span></div>
                <div class="macro-row"><span>🍚 Углеводы</span><span>${r.macros.carbs} г</span></div>
                <small>${r.macroNote}</small>
            </div>
        `).join('');
    }
    
    function calculateAndDisplay() {
        errorSpan.innerText = '';
        const age = parseInt(ageInput.value);
        const weight = parseFloat(weightInput.value);
        const height = parseFloat(heightInput.value);
        
        const validation = validateCalculatorInput({ age, weight, height });
        if (!validation.valid) {
            errorSpan.innerText = validation.error;
            return;
        }
        
        const gender = getGender();
        const formula = formulaSelect.value;
        const bmr = calculateBMR(weight, height, age, gender, formula);
        const tdee = calculateTDEE(bmr, getActivityFactor());
        renderKcalResults(tdee, weight);
    }
    
    calcBtn.addEventListener('click', calculateAndDisplay);
    calculateAndDisplay();
}

// Навигация
function setupNavigation() {
    navBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const blockName = btn.getAttribute('data-block');
            if (!blockName) return;
            if (currentBlock === blockName) return;
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            await loadBlock(blockName);
        });
    });
}

window.addEventListener('DOMContentLoaded', async () => {
    setupNavigation();
    await loadBlock('welcome');
});