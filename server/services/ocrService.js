import OpenAI from 'openai';
import { batchSemanticMatch } from './semanticSearchService.js';

// OpenAI API для OCR
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
 * Сопоставляет распознанные материалы с базой данных используя semantic search
 * @param {Array} rawMaterials - Материалы из OCR
 * @param {Array} dbMaterials - Материалы из БД
 * @returns {Promise<Array>} - Материалы с ID из БД
 */
export async function matchMaterialsWithDatabase(rawMaterials, dbMaterials) {
  console.log(`🔍 [Matching] Сопоставление ${rawMaterials.length} материалов с базой (${dbMaterials.length} записей)`);
  
  try {
    // Используем универсальный сервис batchSemanticMatch
    const queries = rawMaterials.map(m => m.name);
    const matches = await batchSemanticMatch(queries, dbMaterials, 'name', 0.5);
    
    // Собираем результаты
    return rawMaterials.map((raw, index) => {
      const matched = matches[index];
      
      if (matched) {
        return {
          ...raw,
          material_id: matched.id,
          matched_name: matched.name,
          match_confidence: matched.similarity
        };
      } else {
        return {
          ...raw,
          material_id: null,
          matched_name: null,
          match_confidence: 0
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
    
    // Порог совпадения: 0.4 (40%) для fallback
    if (bestMatch && bestScore >= 0.4) {
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
    .replace(/[^а-яa-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Вычисляет схожесть строк (улучшенный fallback)
 */
function calculateSimilarity(str1, str2) {
  const norm1 = normalizeText(str1);
  const norm2 = normalizeText(str2);
  
  // Точное совпадение
  if (norm1 === norm2) return 1.0;
  
  // Одна строка содержится в другой
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return 0.85;
  }
  
  const words1 = norm1.split(' ').filter(w => w.length > 2);
  const words2 = norm2.split(' ').filter(w => w.length > 2);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  // Подсчитываем совпадения слов с весами
  let matchScore = 0;
  
  for (const w1 of words1) {
    for (const w2 of words2) {
      if (w1 === w2) {
        matchScore += 1.0; // точное совпадение
      } else if (w1.includes(w2) || w2.includes(w1)) {
        matchScore += 0.7; // частичное совпадение
      }
    }
  }
  
  return Math.min(matchScore / Math.max(words1.length, words2.length), 1.0);
}

export default { analyzeReceipt, matchMaterialsWithDatabase };
