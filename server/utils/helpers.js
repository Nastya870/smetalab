/**
 * Утилиты для преобразования данных
 */

/**
 * Преобразование объекта из snake_case в camelCase
 * @param {Object} obj - Объект для преобразования
 * @returns {Object} Преобразованный объект
 */
export function toCamelCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      // Преобразуем snake_case в camelCase
      const camelKey = key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
      result[camelKey] = obj[key];
    }
  }
  
  return result;
}

/**
 * Преобразование объекта из camelCase в snake_case
 * @param {Object} obj - Объект для преобразования
 * @returns {Object} Преобразованный объект
 */
export function toSnakeCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      // Преобразуем camelCase в snake_case
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      result[snakeKey] = obj[key];
    }
  }
  
  return result;
}

export default {
  toCamelCase,
  toSnakeCase
};
