/**
 * Универсальный сервис для semantic search (OpenAI Embeddings)
 * Используется во всех справочниках: материалы, работы, контрагенты и т.д.
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Получает embeddings для текстов через OpenAI API
 * @param {Array<string>} texts - Массив текстов
 * @returns {Promise<Array<Array<number>>>} - Массив векторов embeddings
 */
export async function getEmbeddings(texts) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small', // Дешевая модель: $0.00002/1K tokens
      input: texts,
      encoding_format: 'float'
    });

    return response.data.map(item => item.embedding);
  } catch (error) {
    console.error('❌ [Embeddings] Ошибка получения embeddings:', error.message);
    throw error;
  }
}

/**
 * Вычисляет cosine similarity между двумя векторами
 * @param {Array<number>} vec1 
 * @param {Array<number>} vec2 
 * @returns {number} - Значение от 0 до 1
 */
export function cosineSimilarity(vec1, vec2) {
  const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  const magnitude1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
  const magnitude2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
  
  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Универсальная функция semantic search
 * @param {string} query - Поисковый запрос
 * @param {Array<Object>} items - Массив объектов для поиска
 * @param {string} textField - Поле объекта для сравнения (например, 'name')
 * @param {number} threshold - Порог similarity (0-1), по умолчанию 0.5
 * @param {number} limit - Максимальное количество результатов
 * @returns {Promise<Array<Object>>} - Отсортированные результаты с полем similarity
 */
export async function semanticSearch(query, items, textField = 'name', threshold = 0.5, limit = 50) {
  if (!query || !items || items.length === 0) {
    return [];
  }

  try {
    console.log(`🔍 [Semantic Search] Поиск "${query}" среди ${items.length} записей (поле: ${textField})`);
    const startTime = Date.now();

    // Получаем embeddings для запроса и всех элементов
    const allTexts = [query, ...items.map(item => item[textField] || '')];
    const embeddings = await getEmbeddings(allTexts);
    
    const queryEmbedding = embeddings[0];
    const itemEmbeddings = embeddings.slice(1);

    // Вычисляем similarity для каждого элемента
    const results = items.map((item, index) => ({
      ...item,
      similarity: cosineSimilarity(queryEmbedding, itemEmbeddings[index])
    }));

    // Фильтруем по порогу и сортируем
    const filtered = results
      .filter(item => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    const duration = Date.now() - startTime;
    console.log(`✅ [Semantic Search] Найдено ${filtered.length}/${items.length} за ${duration}ms`);

    return filtered;
  } catch (error) {
    console.error('❌ [Semantic Search] Ошибка поиска:', error.message);
    
    // Fallback: простой текстовый поиск
    console.log('⚠️  [Semantic Search] Используем fallback (текстовый поиск)');
    return fallbackTextSearch(query, items, textField, limit);
  }
}

/**
 * Нормализует текст для улучшенного сравнения
 */
function normalizeForSearch(text) {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^а-яa-z0-9\s]/g, ' ') // спецсимволы → пробелы
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fallback: улучшенный текстовый поиск (если Mixedbread недоступен)
 */
function fallbackTextSearch(query, items, textField, limit) {
  const queryNorm = normalizeForSearch(query);
  const queryWords = queryNorm.split(' ').filter(w => w.length > 2); // слова > 2 букв
  
  const results = items
    .map(item => {
      const textNorm = normalizeForSearch(item[textField] || '');
      const textWords = textNorm.split(' ');
      
      // Точное совпадение нормализованного текста
      if (textNorm === queryNorm) {
        return { ...item, similarity: 1.0 };
      }
      
      // Начинается с запроса
      if (textNorm.startsWith(queryNorm)) {
        return { ...item, similarity: 0.95 };
      }
      
      // Содержит весь запрос целиком
      if (textNorm.includes(queryNorm)) {
        return { ...item, similarity: 0.85 };
      }
      
      // Пословное совпадение с весами
      let matchScore = 0;
      let matchedWords = 0;
      
      for (const qw of queryWords) {
        for (const tw of textWords) {
          // Точное совпадение слова
          if (tw === qw) {
            matchScore += 1.0;
            matchedWords++;
            break;
          }
          // Слово начинается с запроса
          if (tw.startsWith(qw)) {
            matchScore += 0.8;
            matchedWords++;
            break;
          }
          // Слово содержит запрос
          if (tw.includes(qw)) {
            matchScore += 0.6;
            matchedWords++;
            break;
          }
          // Запрос содержит слово (обратное)
          if (qw.includes(tw) && tw.length > 2) {
            matchScore += 0.5;
            matchedWords++;
            break;
          }
        }
      }
      
      if (matchedWords > 0) {
        // Similarity = средний вес совпадений
        const similarity = (matchScore / queryWords.length) * 0.75;
        return { ...item, similarity };
      }
      
      return null;
    })
    .filter(item => item !== null && item.similarity >= 0.3) // порог 30%
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
  
  console.log(`⚠️  [Fallback Search] Found ${results.length} results for "${query}"`);
  return results;
}

/**
 * Batch semantic search для множественных запросов
 * Используется в OCR для сопоставления материалов
 */
export async function batchSemanticMatch(queries, items, textField = 'name', threshold = 0.7) {
  if (!queries || queries.length === 0 || !items || items.length === 0) {
    return queries.map(() => null);
  }

  try {
    console.log(`🔍 [Batch Matching] ${queries.length} запросов × ${items.length} записей`);
    const startTime = Date.now();

    // Получаем embeddings для всех запросов и элементов
    const allTexts = [
      ...queries,
      ...items.map(item => item[textField] || '')
    ];
    
    const embeddings = await getEmbeddings(allTexts);
    const queryEmbeddings = embeddings.slice(0, queries.length);
    const itemEmbeddings = embeddings.slice(queries.length);

    // Для каждого запроса находим лучшее совпадение
    const results = queryEmbeddings.map((queryEmb, queryIndex) => {
      let bestMatch = null;
      let bestScore = 0;

      items.forEach((item, itemIndex) => {
        const similarity = cosineSimilarity(queryEmb, itemEmbeddings[itemIndex]);
        
        if (similarity > bestScore) {
          bestScore = similarity;
          bestMatch = { ...item, similarity };
        }
      });

      if (bestMatch && bestScore >= threshold) {
        console.log(`  ✅ "${queries[queryIndex]}" → "${bestMatch[textField]}" (${(bestScore * 100).toFixed(1)}%)`);
        return bestMatch;
      } else {
        console.log(`  ⚠️  "${queries[queryIndex]}" → не найдено (лучший: ${(bestScore * 100).toFixed(1)}%)`);
        return null;
      }
    });

    const duration = Date.now() - startTime;
    const matched = results.filter(r => r !== null).length;
    console.log(`✅ [Batch Matching] ${matched}/${queries.length} сопоставлено за ${duration}ms`);

    return results;
  } catch (error) {
    console.error('❌ [Batch Matching] Ошибка:', error.message);
    return queries.map(() => null);
  }
}

export default {
  getEmbeddings,
  cosineSimilarity,
  semanticSearch,
  batchSemanticMatch
};
