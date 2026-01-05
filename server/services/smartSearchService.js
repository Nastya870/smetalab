/**
 * Smart Search Service
 * Использует GPT для понимания контекста строительных запросов
 */

import OpenAI from 'openai';
import { query as db } from '../config/database.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPTS = {
  material: `Ты эксперт по строительным материалам. Твоя задача - помочь найти материалы в базе данных.

ПРАВИЛА:
1. Если пользователь ищет КОНКРЕТНЫЙ материал (например "штукатурка ротбанд", "цемент м500") - исправь опечатки и верни правильное название
2. Если пользователь описывает ЗАДАЧУ (например "материалы для стяжки", "ремонт ванной") - верни список материалов которые нужны

ВАЖНО про опечатки:
- "родбанд" → "ротбанд" (Rotband)
- "кнауф" → "knauf"  
- "церезит" → "ceresit"
- "ветонит" → "vetonit"
- "плитонит" → "plitonit"

Отвечай ТОЛЬКО списком слов через запятую, без пояснений. Максимум 10 слов.

Примеры:
- "штукатурка родбанд" → штукатурка, ротбанд, rotband, knauf
- "стяжка пола" → цемент, пескобетон, песок, маяки, демпферная лента, грунтовка
- "укладка плитки" → плитка, клей плиточный, затирка, крестики, грунтовка
- "грунтовка тифенгрунт" → грунтовка, tiefengrund, тифенгрунд, knauf`,

  work: `Ты эксперт по строительным работам. Твоя задача - помочь найти работы в базе данных.

ПРАВИЛА:
1. Если пользователь ищет КОНКРЕТНУЮ работу - исправь опечатки и верни правильное название
2. Если пользователь описывает ЗАДАЧУ - верни список работ которые нужны

Отвечай ТОЛЬКО списком слов через запятую, без пояснений. Максимум 10 слов.

Примеры:
- "ремонт ванной" → плитка укладка, гидроизоляция, штукатурка, сантехника монтаж
- "электрика" → проводка, штробление, розетки, выключатели, щиток
- "штукатурка" → штукатурка, выравнивание, маяки`
};

/**
 * Обрабатывает поисковый запрос через GPT:
 * - Исправляет опечатки (родбанд → ротбанд)
 * - Расширяет задачи до списка материалов/работ
 * @param {string} query - Исходный запрос пользователя
 * @param {string} type - 'material' или 'work'
 * @returns {Promise<{keywords: string[], expanded: boolean}>}
 */
export async function expandQueryWithGPT(query, type = 'material') {
  try {
    const systemPrompt = SYSTEM_PROMPTS[type] || SYSTEM_PROMPTS.material;
    
    console.log(`🧠 [SmartSearch] Processing query: "${query}" (type: ${type})`);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      max_tokens: 150,
      temperature: 0.2 // Более детерминированный для исправления опечаток
    });
    
    const rawResponse = response.choices[0].message.content;
    console.log(`🧠 [SmartSearch] RAW GPT response: "${rawResponse}"`);
    
    const keywords = rawResponse
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 0);
    
    console.log(`🧠 [SmartSearch] Parsed keywords (${keywords.length}): ${keywords.join(', ')}`);
    
    return { keywords, expanded: true };
  } catch (error) {
    console.error('❌ [SmartSearch] GPT processing failed:', error.message);
    // Fallback: поиск по оригинальному запросу
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
  const { limit = 20, tenantId = null, scope = 'all' } = options;
  
  // 1. Получаем ключевые слова (с или без GPT в зависимости от типа запроса)
  const { keywords, expanded } = await expandQueryWithGPT(query, 'material');
  
  // 2. Ищем по каждому ключевому слову в БД
  const results = await searchMaterialsByKeywords(keywords, { limit, tenantId, scope });
  
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
  const { limit = 20, tenantId = null, scope = 'all' } = options;
  
  // 1. Получаем ключевые слова (с или без GPT в зависимости от типа запроса)
  const { keywords, expanded } = await expandQueryWithGPT(query, 'work');
  
  // 2. Ищем по каждому ключевому слову в БД
  const results = await searchWorksByKeywords(keywords, { limit, tenantId, scope });
  
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
  const { limit = 20, tenantId = null, scope = 'all' } = options;
  
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
  
  // Фильтр по scope (tenant/global/all)
  let scopeCondition = '';
  console.log(`🔍 [SmartSearch] Materials filter - scope: ${scope}, tenantId: ${tenantId}`);
  
  if (scope === 'global') {
    // Только глобальные материалы
    scopeCondition = 'AND (is_global = true OR tenant_id IS NULL)';
  } else if (scope === 'tenant' && tenantId) {
    // Только материалы тенанта
    scopeCondition = `AND tenant_id = $${params.length + 1} AND (is_global = false OR is_global IS NULL)`;
    params.push(tenantId);
    console.log(`🔍 [SmartSearch] Tenant filter applied: tenant_id = ${tenantId}`);
  } else if (tenantId) {
    // all: и глобальные и тенантные
    scopeCondition = `AND (tenant_id = $${params.length + 1} OR is_global = true OR tenant_id IS NULL)`;
    params.push(tenantId);
  }
  
  // Сортировка через параметры (безопасно от SQL injection)
  // Приоритет: первые ключевые слова GPT важнее
  const sql = `
    SELECT DISTINCT ON (name) id, name, sku, price, unit, supplier, category, is_global, tenant_id
    FROM materials
    WHERE (${conditions.join(' OR ')})
    ${scopeCondition}
    ORDER BY name,
      CASE WHEN is_global = true THEN 0 ELSE 1 END
    LIMIT $${params.length + 1}
  `;
  
  params.push(limit * 2); // берём больше для последующей сортировки
  
  console.log(`🔍 [SmartSearch] Materials SQL scope: ${scope}, tenantId: ${tenantId}`);
  
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
  const { limit = 20, tenantId = null, scope = 'all' } = options;
  
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
  
  // Фильтр по scope (tenant/global/all)
  let scopeCondition = '';
  console.log(`🔍 [SmartSearch] Works filter - scope: ${scope}, tenantId: ${tenantId}`);
  
  if (scope === 'global') {
    // Только глобальные работы
    scopeCondition = 'AND (is_global = true OR tenant_id IS NULL)';
  } else if (scope === 'tenant' && tenantId) {
    // Только работы тенанта
    scopeCondition = `AND tenant_id = $${params.length + 1} AND (is_global = false OR is_global IS NULL)`;
    params.push(tenantId);
    console.log(`🔍 [SmartSearch] Tenant filter applied: tenant_id = ${tenantId}`);
  } else if (tenantId) {
    // all: и глобальные и тенантные
    scopeCondition = `AND (tenant_id = $${params.length + 1} OR is_global = true OR tenant_id IS NULL)`;
    params.push(tenantId);
  }
  
  const sql = `
    SELECT DISTINCT ON (name) id, name, code, base_price as price, unit, category, is_global, tenant_id
    FROM works
    WHERE (${conditions.join(' OR ')})
    ${scopeCondition}
    ORDER BY name,
      CASE WHEN is_global = true THEN 0 ELSE 1 END
    LIMIT $${params.length + 1}
  `;
  
  params.push(limit * 2);
  
  console.log(`🔍 [SmartSearch] Works SQL scope: ${scope}, tenantId: ${tenantId}`);
  
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
