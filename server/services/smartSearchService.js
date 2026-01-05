/**
 * Smart Search Service
 * Использует GPT для понимания контекста строительных запросов
 */

import OpenAI from 'openai';
import { query as db } from '../config/database.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPTS = {
  material: `Ты эксперт по строительным материалам. 
Пользователь описывает задачу или работу. 
Верни список ключевых слов для поиска МАТЕРИАЛОВ, которые могут понадобиться.
Отвечай ТОЛЬКО списком слов через запятую, без пояснений.
Максимум 10 слов. Используй общие названия материалов.

Примеры:
- "стяжка пола" → цемент, пескобетон, песок, маяки, демпферная лента, грунтовка, сетка армирующая
- "поклейка обоев" → обои, клей обойный, грунтовка, шпатлевка, валик, кисть
- "укладка плитки" → плитка, клей плиточный, затирка, крестики, грунтовка`,

  work: `Ты эксперт по строительным работам и ремонту.
Пользователь описывает задачу. 
Верни список ключевых слов для поиска РАБОТ/УСЛУГ, которые могут понадобиться.
Отвечай ТОЛЬКО списком слов через запятую, без пояснений.
Максимум 10 слов. Используй общие названия работ.

Примеры:
- "стяжка пола" → стяжка, выравнивание пола, заливка, армирование, грунтовка, демонтаж
- "ремонт ванной" → плитка укладка, гидроизоляция, штукатурка, сантехника монтаж, затирка
- "электрика в квартире" → проводка, штробление, розетки монтаж, щиток, кабель прокладка`
};

/**
 * Расширяет поисковый запрос через GPT
 * @param {string} query - Исходный запрос пользователя
 * @param {string} type - 'material' или 'work'
 * @returns {Promise<string[]>} - Массив ключевых слов для поиска
 */
export async function expandQueryWithGPT(query, type = 'material') {
  try {
    const systemPrompt = SYSTEM_PROMPTS[type] || SYSTEM_PROMPTS.material;
    
    console.log(`🧠 [SmartSearch] Expanding query: "${query}" (type: ${type})`);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      max_tokens: 150,
      temperature: 0.3 // Более детерминированный ответ
    });
    
    const keywords = response.choices[0].message.content
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 0);
    
    console.log(`🧠 [SmartSearch] GPT keywords: ${keywords.join(', ')}`);
    
    return keywords;
  } catch (error) {
    console.error('❌ [SmartSearch] GPT expansion failed:', error.message);
    // Fallback: возвращаем оригинальный запрос
    return [query];
  }
}

/**
 * Умный поиск материалов через GPT + PostgreSQL
 */
export async function smartSearchMaterials(query, options = {}) {
  const { limit = 20, tenantId = null } = options;
  
  // 1. Получаем ключевые слова от GPT
  const keywords = await expandQueryWithGPT(query, 'material');
  
  // 2. Ищем по каждому ключевому слову в БД
  const results = await searchMaterialsByKeywords(keywords, { limit, tenantId });
  
  return {
    originalQuery: query,
    expandedKeywords: keywords,
    results,
    source: 'smart-gpt'
  };
}

/**
 * Умный поиск работ через GPT + PostgreSQL
 */
export async function smartSearchWorks(query, options = {}) {
  const { limit = 20, tenantId = null } = options;
  
  // 1. Получаем ключевые слова от GPT
  const keywords = await expandQueryWithGPT(query, 'work');
  
  // 2. Ищем по каждому ключевому слову в БД
  const results = await searchWorksByKeywords(keywords, { limit, tenantId });
  
  return {
    originalQuery: query,
    expandedKeywords: keywords,
    results,
    source: 'smart-gpt'
  };
}

/**
 * Поиск материалов по ключевым словам в PostgreSQL
 * С приоритетом для точных совпадений в начале слова
 */
async function searchMaterialsByKeywords(keywords, options = {}) {
  const { limit = 20, tenantId = null } = options;
  
  if (!keywords || keywords.length === 0) {
    return [];
  }
  
  // Создаём условие для поиска по всем ключевым словам
  // Используем word boundary для более точного поиска
  const conditions = keywords.map((_, i) => 
    `(LOWER(name) LIKE $${i + 1} OR LOWER(name) LIKE $${i + 1 + keywords.length})`
  );
  
  // Два варианта: точное начало слова и содержит слово
  const params = [
    ...keywords.map(k => `${k}%`),           // начинается с
    ...keywords.map(k => `% ${k}%`)          // содержит как отдельное слово
  ];
  
  // Добавляем tenant filter
  let tenantCondition = '';
  if (tenantId) {
    tenantCondition = `AND (tenant_id = $${params.length + 1} OR tenant_id IS NULL OR is_global = true)`;
    params.push(tenantId);
  }
  
  // Сортировка: приоритет точным совпадениям
  const orderCases = keywords.map((k, i) => 
    `CASE WHEN LOWER(name) LIKE '${k}%' THEN 0 WHEN LOWER(name) LIKE '% ${k}%' THEN 1 ELSE 2 END`
  ).join(' + ');
  
  const sql = `
    SELECT id, name, sku, price, unit, supplier, category
    FROM materials
    WHERE (${conditions.join(' OR ')})
    ${tenantCondition}
    ORDER BY (${orderCases}),
      CASE WHEN is_global = true THEN 0 ELSE 1 END,
      name
    LIMIT $${params.length + 1}
  `;
  
  params.push(limit);
  
  try {
    const result = await db(sql, params);
    return result.rows.map(row => ({
      ...row,
      type: 'material',
      matchedKeyword: keywords.find(k => row.name.toLowerCase().includes(k)) || keywords[0]
    }));
  } catch (error) {
    console.error('❌ [SmartSearch] Material search failed:', error.message);
    return [];
  }
}

/**
 * Поиск работ по ключевым словам в PostgreSQL
 * С приоритетом для точных совпадений
 */
async function searchWorksByKeywords(keywords, options = {}) {
  const { limit = 20, tenantId = null } = options;
  
  if (!keywords || keywords.length === 0) {
    return [];
  }
  
  // Используем word boundary для более точного поиска
  const conditions = keywords.map((_, i) => 
    `(LOWER(name) LIKE $${i + 1} OR LOWER(name) LIKE $${i + 1 + keywords.length})`
  );
  
  const params = [
    ...keywords.map(k => `${k}%`),           // начинается с
    ...keywords.map(k => `% ${k}%`)          // содержит как отдельное слово
  ];
  
  // Добавляем tenant filter
  let tenantCondition = '';
  if (tenantId) {
    tenantCondition = `AND (tenant_id = $${params.length + 1} OR tenant_id IS NULL OR is_global = true)`;
    params.push(tenantId);
  }
  
  // Сортировка: приоритет точным совпадениям (первые ключевые слова важнее)
  const orderCases = keywords.map((k, i) => 
    `CASE WHEN LOWER(name) LIKE '${k}%' THEN 0 WHEN LOWER(name) LIKE '% ${k}%' THEN 1 ELSE 2 END`
  ).join(' + ');
  
  const sql = `
    SELECT id, name, code, base_price as price, unit, category
    FROM works
    WHERE (${conditions.join(' OR ')})
    ${tenantCondition}
    ORDER BY (${orderCases}),
      CASE WHEN is_global = true THEN 0 ELSE 1 END,
      name
    LIMIT $${params.length + 1}
  `;
  
  params.push(limit);
  
  try {
    const result = await db(sql, params);
    return result.rows.map(row => ({
      ...row,
      type: 'work',
      matchedKeyword: keywords.find(k => row.name.toLowerCase().includes(k)) || keywords[0]
    }));
  } catch (error) {
    console.error('❌ [SmartSearch] Work search failed:', error.message);
    return [];
  }
}

export default {
  expandQueryWithGPT,
  smartSearchMaterials,
  smartSearchWorks
};
