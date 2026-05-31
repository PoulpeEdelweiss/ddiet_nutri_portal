/**
 * Расчёт базального метаболизма (BMR) по выбранной формуле
 * @param {number} weight - вес в кг
 * @param {number} height - рост в см
 * @param {number} age - возраст в годах
 * @param {'male'|'female'} gender - пол пользователя
 * @param {'mifflin'|'harris'} formula - идентификатор формулы
 * @returns {number} BMR в ккал/сутки
 */
export function calculateBMR(weight, height, age, gender, formula = 'mifflin') {
    if (formula === 'mifflin') {
        // Миффлина-Сан Жеора (более современная)
        const base = 10 * weight + 6.25 * height - 5 * age;
        return gender === 'male' ? base + 5 : base - 161;
    } else {
        // Харриса-Бенедикта (классическая)
        if (gender === 'male') {
            return 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age;
        } else {
            return 447.593 + 9.247 * weight + 3.098 * height - 4.330 * age;
        }
    }
}

/**
 * Расчёт суточной нормы калорий (TDEE) с учётом активности
 * @param {number} bmr - базальный метаболизм
 * @param {number} activityFactor - коэффициент физической активности
 * @returns {number} TDEE в ккал/сутки
 */
export function calculateTDEE(bmr, activityFactor) {
    return bmr * activityFactor;
}

/**
 * Расчёт макронутриентов для заданной калорийности и цели
 * @param {number} weight - вес в кг
 * @param {number} calories - целевая калорийность
 * @param {'maintain'|'lose'|'gain'} goalType - тип цели
 * @returns {{protein: number, fat: number, carbs: number}} граммы БЖУ
 */
export function calculateMacros(weight, calories, goalType = 'maintain') {
    let proteinPerKg, fatPerKg;
    
    switch (goalType) {
        case 'lose':
            proteinPerKg = 2.2; fatPerKg = 0.7; break;
        case 'gain':
            proteinPerKg = 1.8; fatPerKg = 0.9; break;
        default:
            proteinPerKg = 1.8; fatPerKg = 0.8;
    }
    
    const proteinG = weight * proteinPerKg;
    const fatG = weight * fatPerKg;
    const proteinCal = proteinG * 4;
    const fatCal = fatG * 9;
    
    let carbCal = calories - proteinCal - fatCal;
    if (carbCal < 0) carbCal = 0;
    const carbG = carbCal / 4;
    
    return {
        protein: Math.round(proteinG),
        fat: Math.round(fatG),
        carbs: Math.round(carbG)
    };
}

/**
 * Генерация результатов для трёх сценариев: поддержание, похудение, набор
 * @param {number} tdee - суточная норма калорий
 * @param {number} weight - вес в кг
 * @returns {Array<{goal: string, label: string, kcal: number, macros: object, macroNote: string}>}
 */
export function generateGoalResults(tdee, weight) {
    const goals = [
        { key: 'maintain', label: '⚖️ Поддержание веса', factor: 1.0, type: 'maintain' },
        { key: 'lose', label: '📉 Снижение веса (дефицит 15%)', factor: 0.85, type: 'lose' },
        { key: 'gain', label: '💪 Набор массы (профицит 10%)', factor: 1.10, type: 'gain' }
    ];
    
    return goals.map(goal => {
        const kcal = Math.round(tdee * goal.factor);
        const macros = calculateMacros(weight, kcal, goal.type);
        return {
            goal: goal.key,
            label: goal.label,
            kcal,
            macros,
            macroNote: getMacroNote(goal.type)
        };
    });
}

/**
 * Вспомогательная функция: пояснение к макронутриентам
 * @param {'maintain'|'lose'|'gain'} goalType
 * @returns {string}
 */
function getMacroNote(goalType) {
    switch (goalType) {
        case 'lose': return 'белки ↑ 2.2 / жиры ↓ 0.7 г на кг';
        case 'gain': return 'белки 1.8 / жиры ↑ 0.9 г на кг';
        default: return 'норма 1.8/0.8 г на кг';
    }
}

/**
 * Валидация входных данных калькулятора
 * @param {{age: number, weight: number, height: number}} data
 * @returns {{valid: boolean, error?: string}}
 */
export function validateCalculatorInput({ age, weight, height }) {
    if (isNaN(age) || age < 1 || age > 100) {
        return { valid: false, error: 'Возраст от 1 до 100 лет.' };
    }
    if (isNaN(weight) || weight <= 0) {
        return { valid: false, error: 'Корректный вес (кг).' };
    }
    if (isNaN(height) || height <= 0) {
        return { valid: false, error: 'Корректный рост (см).' };
    }
    return { valid: true };
}