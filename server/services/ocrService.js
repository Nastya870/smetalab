import OpenAI from 'openai';

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
 * Сопоставляет распознанные материалы с базой данных
 * @param {Array} rawMaterials - Материалы из OCR
 * @param {Array} dbMaterials - Материалы из БД
 * @returns {Array} - Материалы с ID из БД
 */
export function matchMaterialsWithDatabase(rawMaterials, dbMaterials) {
  console.log(`🔍 [Matching] Сопоставление ${rawMaterials.length} материалов с базой (${dbMaterials.length} записей)`);
  
  return rawMaterials.map(raw => {
    // Простой поиск по названию (можно улучшить fuzzy matching)
    const nameLower = raw.name.toLowerCase();
    
    const matched = dbMaterials.find(db => {
      const dbNameLower = db.name.toLowerCase();
      
      // Точное совпадение
      if (dbNameLower === nameLower) return true;
      
      // Частичное совпадение (название из OCR содержится в БД)
      if (dbNameLower.includes(nameLower)) return true;
      
      // Обратное (название из БД содержится в OCR)
      if (nameLower.includes(dbNameLower)) return true;
      
      return false;
    });

    if (matched) {
      console.log(`  ✅ "${raw.name}" → "${matched.name}" (ID: ${matched.id})`);
      return {
        ...raw,
        material_id: matched.id,
        matched_name: matched.name,
        match_confidence: 0.9
      };
    } else {
      console.log(`  ⚠️  "${raw.name}" → не найдено в БД`);
      return {
        ...raw,
        material_id: null,
        matched_name: null,
        match_confidence: 0
      };
    }
  });
}

export default { analyzeReceipt, matchMaterialsWithDatabase };
