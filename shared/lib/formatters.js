/**
 * Форматирование валюты (рубли)
 * @param {number} value - Значение для форматирования
 * @returns {string} - Отформатированная строка с валютой
 */
export const formatCurrency = (value) => {
  if (value === null || value === undefined) return '0 ₽';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return '0 ₽';
  
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numValue);
};

/**
 * Форматирование числа с разделителями тысяч
 * @param {number} value - Значение для форматирования
 * @param {number} decimals - Количество знаков после запятой
 * @returns {string} - Отформатированная строка
 */
export const formatNumber = (value, decimals = 2) => {
  if (value === null || value === undefined) return '0';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return '0';
  
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(numValue);
};

/**
 * Форматирование даты
 * @param {string|Date} date - Дата для форматирования
 * @returns {string} - Отформатированная дата
 */
export const formatDate = (date) => {
  if (!date) return '-';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '-';
  
  return dateObj.toLocaleDateString('ru-RU');
};

/**
 * Форматирование даты и времени
 * @param {string|Date} date - Дата для форматирования
 * @returns {string} - Отформатированная дата и время
 */
export const formatDateTime = (date) => {
  if (!date) return '-';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '-';
  
  return dateObj.toLocaleString('ru-RU');
};
