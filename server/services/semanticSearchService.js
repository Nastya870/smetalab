/**
 * Универсальный сервис для semantic search (Mixedbread AI)
 * Используется во всех справочниках: материалы, работы, контрагенты и т.д.
 */

const MIXEDBREAD_API_URL = 'https://api.mixedbread.ai/v1/embeddings';
const MIXEDBREAD_API_KEY = process.env.MIXEDBREAD_API_KEY;

/**
 * Получает embeddings для текстов через Mixedbread API
 * @param {Array<string>} texts - Массив текстов
 * @returns {Promise<Array<Array<number>>>} - Массив векторов embeddings
 */
export async function getEmbeddings(texts) {
  try {
    const response = await fetch(MIXEDBREAD_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MIXEDBREAD_API_KEY}`
      },
      body: JSON.stringify({
        model: 'mxbai-embed-large-v1',
        input: texts,
        encoding_format: 'float',
        normalized: true
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mixedbread API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.data.map(item => item.embedding);
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
 * Fallback: простой текстовый поиск (если Mixedbread недоступен)
 */
function fallbackTextSearch(query, items, textField, limit) {
  const queryLower = query.toLowerCase().trim();
  
  const results = items
    .map(item => {
      const text = (item[textField] || '').toLowerCase();
      
      // Точное совпадение
      if (text === queryLower) {
        return { ...item, similarity: 1.0 };
      }
      
      // Начинается с запроса
      if (text.startsWith(queryLower)) {
        return { ...item, similarity: 0.9 };
      }
      
      // Содержит запрос
      if (text.includes(queryLower)) {
        return { ...item, similarity: 0.7 };
      }
      
      // Пословное совпадение
      const queryWords = queryLower.split(/\s+/);
      const textWords = text.split(/\s+/);
      const matchedWords = queryWords.filter(qw => 
        textWords.some(tw => tw.includes(qw) || qw.includes(tw))
      ).length;
      
      if (matchedWords > 0) {
        return { ...item, similarity: matchedWords / queryWords.length * 0.6 };
      }
      
      return null;
    })
    .filter(item => item !== null)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
  
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
