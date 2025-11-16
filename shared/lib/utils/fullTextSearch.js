/**
 * Утилита для полнотекстового поиска
 * Поддерживает поиск по нескольким словам одновременно
 * 
 * @module fullTextSearch
 */

/**
 * Нормализует текст для поиска (приводит к нижнему регистру, удаляет лишние пробелы)
 * @param {string} text - Текст для нормализации
 * @returns {string} Нормализованный текст
 */
const normalizeText = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text.toLowerCase().trim();
};

/**
 * Разбивает поисковый запрос на отдельные слова
 * @param {string} query - Поисковый запрос
 * @returns {string[]} Массив слов
 */
const tokenizeQuery = (query) => {
  if (!query || typeof query !== 'string') return [];
  
  return query
    .toLowerCase()
    .trim()
    .split(/\s+/) // Разбиваем по пробелам
    .filter(word => word.length > 0) // Убираем пустые строки
    .map(word => word.replace(/[^\wа-яёЁ]/g, '')); // Убираем спецсимволы, оставляем буквы и цифры
};

/**
 * Проверяет, содержит ли текст все слова из запроса
 * @param {string} text - Текст для проверки
 * @param {string[]} words - Массив слов для поиска
 * @returns {boolean} true если текст содержит все слова
 */
const containsAllWords = (text, words) => {
  if (!text || !words || words.length === 0) return true;
  
  const normalizedText = normalizeText(text);
  
  // Проверяем, что текст содержит ВСЕ слова (логическое И)
  return words.every(word => normalizedText.includes(word));
};

/**
 * Основная функция полнотекстового поиска
 * Ищет элементы, которые содержат ВСЕ слова из поискового запроса
 * 
 * @param {Array} items - Массив элементов для поиска
 * @param {string} query - Поисковый запрос
 * @param {string[]} searchFields - Поля для поиска (например: ['name', 'code', 'category'])
 * @returns {Array} Отфильтрованный массив элементов
 * 
 * @example
 * const works = [
 *   { name: 'Демонтаж цементной стяжки', code: '01-01' },
 *   { name: 'Покраска стен водоэмульсионной краской', code: '02-01' }
 * ];
 * 
 * fullTextSearch(works, 'демонтаж стяжки', ['name', 'code']);
 * // Вернет: [{ name: 'Демонтаж цементной стяжки', code: '01-01' }]
 * 
 * fullTextSearch(works, 'покраска стен', ['name']);
 * // Вернет: [{ name: 'Покраска стен водоэмульсионной краской', code: '02-01' }]
 */
export const fullTextSearch = (items, query, searchFields = ['name']) => {
  // Если запрос пустой, возвращаем все элементы
  if (!query || query.trim().length === 0) {
    return items;
  }

  // Разбиваем запрос на слова
  const words = tokenizeQuery(query);
  
  // Если после токенизации нет слов, возвращаем все элементы
  if (words.length === 0) {
    return items;
  }

  // Фильтруем элементы
  return items.filter(item => {
    // Проверяем каждое поле для поиска
    return searchFields.some(field => {
      const fieldValue = item[field];
      if (!fieldValue) return false;
      
      // Проверяем, содержит ли поле все слова
      return containsAllWords(fieldValue, words);
    });
  });
};

/**
 * Расширенная версия полнотекстового поиска с подсветкой совпадений
 * @param {Array} items - Массив элементов для поиска
 * @param {string} query - Поисковый запрос
 * @param {string[]} searchFields - Поля для поиска
 * @returns {Array} Массив элементов с добавленным полем _matchScore
 */
export const fullTextSearchWithScore = (items, query, searchFields = ['name']) => {
  if (!query || query.trim().length === 0) {
    return items.map(item => ({ ...item, _matchScore: 0 }));
  }

  const words = tokenizeQuery(query);
  if (words.length === 0) {
    return items.map(item => ({ ...item, _matchScore: 0 }));
  }

  return items
    .map(item => {
      let matchCount = 0;
      let totalMatches = 0;

      searchFields.forEach(field => {
        const fieldValue = item[field];
        if (!fieldValue) return;

        const normalizedValue = normalizeText(fieldValue);
        words.forEach(word => {
          if (normalizedValue.includes(word)) {
            matchCount++;
            // Дополнительные очки за точное совпадение в начале строки
            if (normalizedValue.startsWith(word)) {
              totalMatches += 2;
            } else {
              totalMatches += 1;
            }
          }
        });
      });

      return {
        ...item,
        _matchScore: totalMatches,
        _matchCount: matchCount
      };
    })
    .filter(item => item._matchCount === words.length) // Только элементы с ВСЕМИ словами
    .sort((a, b) => b._matchScore - a._matchScore); // Сортируем по релевантности
};

/**
 * Вспомогательная функция для подсветки совпадений в тексте
 * @param {string} text - Исходный текст
 * @param {string} query - Поисковый запрос
 * @returns {Array} Массив фрагментов текста с пометками о совпадениях
 */
export const highlightMatches = (text, query) => {
  if (!text || !query) return [{ text, match: false }];

  const words = tokenizeQuery(query);
  if (words.length === 0) return [{ text, match: false }];

  // Создаем регулярное выражение для поиска всех слов
  const pattern = new RegExp(`(${words.join('|')})`, 'gi');
  const parts = text.split(pattern);

  return parts.map(part => ({
    text: part,
    match: words.some(word => part.toLowerCase().includes(word))
  }));
};

/**
 * Debounced версия полнотекстового поиска для использования в React
 * Использовать совместно с lodash.debounce
 */
export default fullTextSearch;
