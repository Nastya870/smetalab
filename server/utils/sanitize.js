/**
 * Error Sanitization Utility
 * 
 * Экранирует потенциально опасные символы в сообщениях об ошибках
 * для защиты от XSS атак через error messages
 */

/**
 * Экранирует HTML-опасные символы
 * @param {string} str - Строка для экранирования
 * @returns {string} - Экранированная строка
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Санитизирует сообщение об ошибке
 * Удаляет потенциально опасные теги, но сохраняет читаемость
 * @param {string} message - Сообщение об ошибке
 * @returns {string} - Безопасное сообщение
 */
export function sanitizeErrorMessage(message) {
  if (typeof message !== 'string') return message;
  
  // Удаляем теги script и обработчики событий
  return message
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '[removed]')
    .replace(/<[^>]*on\w+\s*=/gi, '<[removed]=')
    .replace(/javascript:/gi, '[removed]:')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Санитизирует объект ошибки рекурсивно
 * @param {any} obj - Объект для санитизации
 * @returns {any} - Санитизированный объект
 */
export function sanitizeErrorObject(obj) {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeErrorMessage(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeErrorObject);
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key of Object.keys(obj)) {
      sanitized[key] = sanitizeErrorObject(obj[key]);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Создаёт безопасный ответ об ошибке
 * @param {string} message - Сообщение для пользователя
 * @param {string} error - Техническая ошибка (будет санитизирована)
 * @returns {object} - Безопасный объект ответа
 */
export function createSafeErrorResponse(message, error = null) {
  const response = {
    success: false,
    message: sanitizeErrorMessage(message)
  };
  
  if (error) {
    response.error = sanitizeErrorMessage(
      typeof error === 'string' ? error : error.message || String(error)
    );
  }
  
  return response;
}

export default {
  escapeHtml,
  sanitizeErrorMessage,
  sanitizeErrorObject,
  createSafeErrorResponse
};
