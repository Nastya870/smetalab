/**
 * Smart Search Service
 * Использует GPT для понимания контекста строительных запросов
 */

import OpenAI from 'openai';
import { query as db } from '../config/database.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPTS = {
  material: `Ты эксперт по строительным материалам.
Пользователь описывает ЗАДАЧУ или РАБОТУ (не конкретный материал).
Верни список ключевых слов для поиска МАТЕРИАЛОВ, которые понадобятся для этой задачи.
Отвечай ТОЛЬКО списком слов через запятую, без пояснений.
Максимум 10 слов. Используй общие названия материалов.

Примеры:
- "стяжка пола" → цемент, пескобетон, песок, маяки, демпферная лента, грунтовка, сетка
- "поклейка обоев" → обои, клей обойный, грунтовка, шпатлевка
- "укладка плитки" → плитка, клей плиточный, затирка, крестики, грунтовка
- "штукатурка стен" → штукатурка, маяки, грунтовка, правило, сетка штукатурная`,

  work: `Ты эксперт по строительным работам и ремонту.
Пользователь описывает ЗАДАЧУ (не конкретную работу).
Верни список ключевых слов для поиска РАБОТ/УСЛУГ, которые понадобятся.
Отвечай ТОЛЬКО списком слов через запятую, без пояснений.
Максимум 10 слов. Используй общие названия работ.

Примеры:
- "ремонт ванной" → плитка укладка, гидроизоляция, штукатурка, сантехника монтаж
- "электрика в квартире" → проводка, штробление, розетки монтаж, щиток
- "отделка стен" → штукатурка, шпаклевка, грунтовка, покраска`
};

/**
 * Определяет, является ли запрос конкретным материалом/работой или задачей
 * @param {string} query - Поисковый запрос
 * @returns {boolean} - true если это задача (нужно расширение), false если конкретный материал
 */
function isTaskQuery(query) {
  const normalizedQuery = query.toLowerCase().trim();
  
  // Признаки задачи (нужно расширение через GPT):
  const taskIndicators = [
    'для ', 'под ', 'на ', 'при ', // предлоги указывают на контекст
    'работ', 'ремонт', 'монтаж', 'установк', 'укладк', 'поклейк', 'покраск',
    'отделк', 'утеплен', 'гидроизоляц',
    'стен', 'пол', 'потолк', 'ванн', 'кухн', 'комнат', // места работ
    'материал', 'нужно', 'необходим', 'требуется', 'что купить'
  ];
  
  // Если запрос содержит признаки задачи - это задача
  if (taskIndicators.some(indicator => normalizedQuery.includes(indicator))) {
    return true;
  }
  
  // Если запрос из 2+ слов и НЕ похож на название материала - вероятно задача
  const words = normalizedQuery.split(/\s+/).filter(w => w.length > 2);
  if (words.length >= 3) {
    return true; // "штукатурка гипсовая Knauf" - это материал, но "штукатурка стен в ванной" - задача
  }
  
  // Короткий запрос (1-2 слова) - скорее всего конкретный материал
  return false;
}

/**
 * Расширяет поисковый запрос через GPT (только для задач)
 * @param {string} query - Исходный запрос пользователя
 * @param {string} type - 'material' или 'work'
 * @returns {Promise<{keywords: string[], expanded: boolean}>}
 */
export async function expandQueryWithGPT(query, type = 'material') {
  // Проверяем, нужно ли расширение
  const needsExpansion = isTaskQuery(query);
  
  if (!needsExpansion) {
    console.log(`🔍 [SmartSearch] Direct search for: "${query}" (no GPT expansion needed)`);
    return { 
      keywords: [query.toLowerCase().trim()], 
      expanded: false 
    };
  }
  
  try {
    const systemPrompt = SYSTEM_PROMPTS[type] || SYSTEM_PROMPTS.material;
    
    console.log(`🧠 [SmartSearch] Expanding task query: "${query}" (type: ${type})`);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      max_tokens: 150,
      temperature: 0.3
    });
    
    const keywords = response.choices[0].message.content
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 0);
    
    console.log(`🧠 [SmartSearch] GPT keywords: ${keywords.join(', ')}`);
    
    return { keywords, expanded: true };
  } catch (error) {
    console.error('❌ [SmartSearch] GPT expansion failed:', error.message);
    return { 
      keywords: [query.toLowerCase().trim()], 
      expanded: false 
    };
  }
}

/**
 * Умный поиск материалов через GPT + PostgreSQL
 */
export async function smartSearchMaterials(query, options = {}) {
  const { limit = 20, tenantId = null } = options;
  
  // 1. Получаем ключевые слова (с или без GPT в зависимости от типа запроса)
  const { keywords, expanded } = await expandQueryWithGPT(query, 'material');
  
  // 2. Ищем по каждому ключевому слову в БД
  const results = await searchMaterialsByKeywords(keywords, { limit, tenantId });
  
  return {
    originalQuery: query,
    expandedKeywords: keywords,
    expanded, // true если GPT расширил запрос, false если прямой поиск
    results,
    source: expanded ? 'smart-gpt' : 'direct'
  };
}

/**
 * Умный поиск работ через GPT + PostgreSQL
 */
export async function smartSearchWorks(query, options = {}) {
  const { limit = 20, tenantId = null } = options;
  
  // 1. Получаем ключевые слова (с или без GPT в зависимости от типа запроса)
  const { keywords, expanded } = await expandQueryWithGPT(query, 'work');
  
  // 2. Ищем по каждому ключевому слову в БД
  const results = await searchWorksByKeywords(keywords, { limit, tenantId });
  
  return {
    originalQuery: query,
    expandedKeywords: keywords,
    expanded, // true если GPT расширил запрос, false если прямой поиск
    results,
    source: expanded ? 'smart-gpt' : 'direct'
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
  
  // Sanitize keywords - убираем спецсимволы для безопасности SQL
  const safeKeywords = keywords
    .map(k => k.replace(/[%_'"\\]/g, '').trim())
    .filter(k => k.length >= 2); // минимум 2 символа
  
  if (safeKeywords.length === 0) {
    return [];
  }
  
  // Создаём условие для поиска по всем ключевым словам
  const conditions = safeKeywords.map((_, i) => 
    `(LOWER(name) LIKE $${i + 1} OR LOWER(name) LIKE $${i + 1 + safeKeywords.length})`
  );
  
  // Два варианта: точное начало слова и содержит слово
  const params = [
    ...safeKeywords.map(k => `${k}%`),           // начинается с
    ...safeKeywords.map(k => `% ${k}%`)          // содержит как отдельное слово
  ];
  
  // Добавляем tenant filter
  let tenantCondition = '';
  if (tenantId) {
    tenantCondition = `AND (tenant_id = $${params.length + 1} OR tenant_id IS NULL OR is_global = true)`;
    params.push(tenantId);
  }
  
  // Сортировка через параметры (безопасно от SQL injection)
  // Приоритет: первые ключевые слова GPT важнее
  const sql = `
    SELECT DISTINCT ON (name) id, name, sku, price, unit, supplier, category
    FROM materials
    WHERE (${conditions.join(' OR ')})
    ${tenantCondition}
    ORDER BY name,
      CASE WHEN is_global = true THEN 0 ELSE 1 END
    LIMIT $${params.length + 1}
  `;
  
  params.push(limit * 2); // берём больше для последующей сортировки
  
  try {
    const result = await db(sql, params);
    
    // Сортируем в JS по релевантности ключевых слов
    const sorted = result.rows.sort((a, b) => {
      const aIndex = safeKeywords.findIndex(k => a.name.toLowerCase().includes(k));
      const bIndex = safeKeywords.findIndex(k => b.name.toLowerCase().includes(k));
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });
    
    return sorted.slice(0, limit).map(row => ({
      ...row,
      type: 'material',
      matchedKeyword: safeKeywords.find(k => row.name.toLowerCase().includes(k)) || safeKeywords[0]
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
  
  // Sanitize keywords - убираем спецсимволы для безопасности SQL
  const safeKeywords = keywords
    .map(k => k.replace(/[%_'"\\]/g, '').trim())
    .filter(k => k.length >= 2);
  
  if (safeKeywords.length === 0) {
    return [];
  }
  
  const conditions = safeKeywords.map((_, i) => 
    `(LOWER(name) LIKE $${i + 1} OR LOWER(name) LIKE $${i + 1 + safeKeywords.length})`
  );
  
  const params = [
    ...safeKeywords.map(k => `${k}%`),
    ...safeKeywords.map(k => `% ${k}%`)
  ];
  
  let tenantCondition = '';
  if (tenantId) {
    tenantCondition = `AND (tenant_id = $${params.length + 1} OR tenant_id IS NULL OR is_global = true)`;
    params.push(tenantId);
  }
  
  const sql = `
    SELECT DISTINCT ON (name) id, name, code, base_price as price, unit, category
    FROM works
    WHERE (${conditions.join(' OR ')})
    ${tenantCondition}
    ORDER BY name,
      CASE WHEN is_global = true THEN 0 ELSE 1 END
    LIMIT $${params.length + 1}
  `;
  
  params.push(limit * 2);
  
  try {
    const result = await db(sql, params);
    
    // Сортируем по релевантности ключевых слов
    const sorted = result.rows.sort((a, b) => {
      const aIndex = safeKeywords.findIndex(k => a.name.toLowerCase().includes(k));
      const bIndex = safeKeywords.findIndex(k => b.name.toLowerCase().includes(k));
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });
    
    return sorted.slice(0, limit).map(row => ({
      ...row,
      type: 'work',
      matchedKeyword: safeKeywords.find(k => row.name.toLowerCase().includes(k)) || safeKeywords[0]
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
