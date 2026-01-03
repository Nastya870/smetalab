import OpenAI from 'openai';

// OpenAI API для OCR
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Mixedbread API для semantic search
const MIXEDBREAD_API_URL = 'https://api.mixedbread.ai/v1/embeddings';
const MIXEDBREAD_API_KEY = process.env.MIXEDBREAD_API_KEY;

/**
 * Распознает накладную с помощью OpenAI GPT-4o Vision
 * @param {Buffer} imageBuffer - Буфер изображения
 * @param {string} mimeType - MIME тип (image/jpeg, image/png)
 * @returns {Promise<{documentType: string, supplier: string, materials: Array}>}
 */
export async function analyzeReceipt(imageBuffer, mimeType = 'image/jpeg') {
  try {
    console.log('🤖 [OCR] Отправка изображения в OpenAI GPT-4o Vision...');
    const startTime = Date.now();

    // Конвертируем в base64
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    // Запрос к OpenAI Vision
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Ты помощник сметчика. Извлекай данные из накладных стройматериалов.

Верни JSON:
{
  "documentType": "printed" | "handwritten",
  "supplier": "название поставщика",
  "documentNumber": "номер накладной",
  "materials": [
    {
      "name": "точное название материала",
      "quantity": число,
      "unit": "шт" | "м" | "м²" | "кг" и т.д.,
      "price": число (цена за единицу),
      "total": число (общая стоимость),
      "confidence": 0.0-1.0 (уверенность)
    }
  ]
}

Правила:
- Если не уверен - confidence < 0.7
- Только числа в quantity/price
- НДС не включать
- Округление до 2 знаков`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Извлеки список материалов с ценами из накладной. Верни JSON.'
            },
            {
              type: 'image_url',
              image_url: {
                url: dataUrl,
                detail: 'high'
              }
            }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
      temperature: 0.1
    });

    const duration = Date.now() - startTime;
    console.log(`✅ [OCR] OpenAI завершил распознавание за ${duration}ms`);

    // Парсим JSON
    const result = JSON.parse(response.choices[0].message.content);
    
    console.log(`📦 [OCR] Найдено материалов: ${result.materials?.length || 0}`);
    console.log(`📄 [OCR] Тип документа: ${result.documentType}`);
    
    return result;
  } catch (error) {
    console.error('❌ [OCR] Ошибка распознавания:', error.message);
    throw new Error(`Не удалось распознать накладную: ${error.message}`);
  }
}

/**
 * Получает embeddings для текстов через Mixedbread API
 * @param {Array<string>} texts - Массив текстов
 * @returns {Promise<Array<Array<number>>>} - Массив векторов embeddings
 */
async function getEmbeddings(texts) {
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
        normalized: true // Возвращает нормализованные векторы для cosine similarity
      })
    });

    if (!response.ok) {
      throw new Error(`Mixedbread API error: ${response.status} ${response.statusText}`);
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
function cosineSimilarity(vec1, vec2) {
  const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  const magnitude1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
  const magnitude2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
  
  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Сопоставляет распознанные материалы с базой данных используя semantic search
 * @param {Array} rawMaterials - Материалы из OCR
 * @param {Array} dbMaterials - Материалы из БД
 * @returns {Promise<Array>} - Материалы с ID из БД
 */
export async function matchMaterialsWithDatabase(rawMaterials, dbMaterials) {
  console.log(`🔍 [Matching] Сопоставление ${rawMaterials.length} материалов с базой (${dbMaterials.length} записей)`);
  
  try {
    // Получаем embeddings для всех текстов одним запросом
    const allTexts = [
      ...rawMaterials.map(m => m.name),
      ...dbMaterials.map(m => m.name)
    ];
    
    console.log(`🧠 [Embeddings] Получение векторов для ${allTexts.length} текстов...`);
    const embeddings = await getEmbeddings(allTexts);
    
    // Разделяем embeddings
    const rawEmbeddings = embeddings.slice(0, rawMaterials.length);
    const dbEmbeddings = embeddings.slice(rawMaterials.length);
    
    // Сопоставляем каждый материал из OCR с БД
    return rawMaterials.map((raw, rawIndex) => {
      let bestMatch = null;
      let bestScore = 0;
      
      // Ищем наиболее похожий материал в БД
      dbMaterials.forEach((db, dbIndex) => {
        const similarity = cosineSimilarity(rawEmbeddings[rawIndex], dbEmbeddings[dbIndex]);
        
        if (similarity > bestScore) {
          bestScore = similarity;
          bestMatch = db;
        }
      });
      
      // Порог для semantic similarity: 0.7 (70%)
      if (bestMatch && bestScore >= 0.7) {
        console.log(`  ✅ "${raw.name}" → "${bestMatch.name}" (ID: ${bestMatch.id}, similarity: ${(bestScore * 100).toFixed(1)}%)`);
        return {
          ...raw,
          material_id: bestMatch.id,
          matched_name: bestMatch.name,
          match_confidence: bestScore
        };
      } else {
        console.log(`  ⚠️  "${raw.name}" → не найдено в БД (лучший score: ${(bestScore * 100).toFixed(1)}%)`);
        return {
          ...raw,
          material_id: null,
          matched_name: null,
          match_confidence: bestScore
        };
      }
    });
  } catch (error) {
    console.error('❌ [Matching] Ошибка semantic matching, используем fallback:', error.message);
    
    // Fallback на старый алгоритм если Mixedbread не доступен
    return matchMaterialsFallback(rawMaterials, dbMaterials);
  }
}

/**
 * Fallback алгоритм сопоставления (пословное сравнение)
 */
function matchMaterialsFallback(rawMaterials, dbMaterials) {
  console.log('⚠️  [Matching] Используем fallback алгоритм (пословное сравнение)');
  
  return rawMaterials.map(raw => {
    let bestMatch = null;
    let bestScore = 0;
    
    // Ищем лучшее совпадение
    for (const db of dbMaterials) {
      const score = calculateSimilarity(raw.name, db.name);
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = db;
      }
    }
    
    // Порог совпадения: 0.5 (50%)
    if (bestMatch && bestScore >= 0.5) {
      console.log(`  ✅ "${raw.name}" → "${bestMatch.name}" (ID: ${bestMatch.id}, similarity: ${(bestScore * 100).toFixed(0)}%)`);
      return {
        ...raw,
        material_id: bestMatch.id,
        matched_name: bestMatch.name,
        match_confidence: bestScore
      };
    } else {
      console.log(`  ⚠️  "${raw.name}" → не найдено в БД (лучший score: ${(bestScore * 100).toFixed(0)}%)`);
      return {
        ...raw,
        material_id: null,
        matched_name: null,
        match_confidence: 0
      };
    }
  });
}

/**
 * Нормализует текст для сравнения (fallback)
 */
function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^а-яa-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Вычисляет схожесть строк (fallback)
 */
function calculateSimilarity(str1, str2) {
  const normalized1 = normalizeText(str1);
  const normalized2 = normalizeText(str2);
  
  if (normalized1 === normalized2) return 1.0;
  
  const words1 = normalized1.split(' ');
  const words2 = normalized2.split(' ');
  
  const commonWords = words1.filter(word => 
    words2.some(w2 => w2.includes(word) || word.includes(w2))
  ).length;
  
  return commonWords / Math.max(words1.length, words2.length);
}

export default { analyzeReceipt, matchMaterialsWithDatabase };
