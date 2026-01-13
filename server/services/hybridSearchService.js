/**
 * Hybrid Search Service
 * Комбинирует keyword (PostgreSQL) и semantic (Pinecone) поиск
 */

import pool from '../config/database.js';
import * as pineconeClient from './pineconeClient.js';

/**
 * Определяет стратегию поиска на основе запроса
 */
export function getSearchStrategy(query) {
  const words = query.trim().split(/\s+/);
  const isShort = words.length <= 2;
  
  // Категорийные термины (усиливаем keyword)
  const categoryTerms = [
    'цемент', 'кирпич', 'арматура', 'краска', 'утеплитель', 'профиль',
    'монтаж', 'демонтаж', 'покраска', 'штукатурка', 'стяжка', 'окраска',
    'гипсокартон', 'труба', 'доска', 'брус', 'плитка', 'ламинат'
  ];
  
  const hasCategories = words.some(word => 
    categoryTerms.some(term => word.toLowerCase().includes(term))
  );
  
  if (isShort || hasCategories) {
    return {
      mode: 'hybrid',
      keywordWeight: 0.6,
      semanticWeight: 0.4
    };
  }
  
  return {
    mode: 'semantic',
    keywordWeight: 0.3,
    semanticWeight: 0.7
  };
}

/**
 * Keyword поиск через PostgreSQL (pg_trgm fuzzy matching)
 * Использует word_similarity() для поиска слов с опечатками
 */
export async function keywordSearch(query, { type = 'all', scope = 'all', tenantId, limit = 20 }) {
  const searchTerm = query.toLowerCase().trim();
  const searchPattern = `%${searchTerm}%`;
  
  // Разбиваем на слова для более точного поиска
  const words = searchTerm.split(/\s+/).filter(w => w.length >= 2);
  
  console.log(`[Keyword] Query: "${query}" | Words: ${words.length} | Type: ${type} | Scope: ${scope}`);
  
  // Определяем таблицы для поиска
  const searches = [];
  
  if (type === 'material' || type === 'all') {
    // 🔧 FUZZY SEARCH: word_similarity() ищет слово ВНУТРИ строки
    // Порог 0.4 = ловит опечатки в 1-2 буквы ("ротбант" → "Ротбанд")
    let materialQuery = `
      SELECT 
        'material' as type,
        id::text as db_id,
        name,
        category,
        supplier,
        unit,
        sku as key,
        CASE 
          WHEN tenant_id IS NULL THEN 'global'
          ELSE 'tenant'
        END as scope,
        GREATEST(
          word_similarity($1, LOWER(name)),
          word_similarity($1, LOWER(COALESCE(category, ''))) * 0.8,
          word_similarity($1, LOWER(COALESCE(supplier, ''))) * 0.6,
          word_similarity($1, LOWER(COALESCE(sku, ''))) * 0.5
        ) as score
      FROM materials
      WHERE 
        -- Fuzzy: word_similarity >= 0.35 ИЛИ точное вхождение (ILIKE)
        (
          word_similarity($1, LOWER(name)) >= 0.35
          OR word_similarity($1, LOWER(COALESCE(category, ''))) >= 0.35
          OR word_similarity($1, LOWER(COALESCE(supplier, ''))) >= 0.35
          OR name ILIKE $2 
          OR category ILIKE $2 
          OR supplier ILIKE $2 
          OR sku ILIKE $2
        )
    `;
    
    const params = [searchTerm, searchPattern];
    
    if (scope === 'global') {
      materialQuery += ' AND tenant_id IS NULL';
    } else if (scope === 'tenant' && tenantId) {
      materialQuery += ' AND tenant_id = $3';
      params.push(tenantId);
    }
    
    materialQuery += ' ORDER BY score DESC LIMIT $' + (params.length + 1);
    params.push(limit);
    
    searches.push({ type: 'material', query: materialQuery, params });
  }
  
  if (type === 'work' || type === 'all') {
    // 🔧 FUZZY SEARCH для работ с word_similarity
    let workQuery = `
      SELECT 
        'work' as type,
        id::text as db_id,
        name,
        category,
        '' as supplier,
        unit,
        code as key,
        CASE 
          WHEN tenant_id IS NULL THEN 'global'
          ELSE 'tenant'
        END as scope,
        GREATEST(
          word_similarity($1, LOWER(name)),
          word_similarity($1, LOWER(COALESCE(category, ''))) * 0.8,
          word_similarity($1, LOWER(COALESCE(code, ''))) * 0.5
        ) as score
      FROM works
      WHERE 
        (
          word_similarity($1, LOWER(name)) >= 0.35
          OR word_similarity($1, LOWER(COALESCE(category, ''))) >= 0.35
          OR name ILIKE $2 
          OR category ILIKE $2 
          OR code ILIKE $2
        )
    `;
    
    const params = [searchTerm, searchPattern];
    
    if (scope === 'global') {
      workQuery += ' AND tenant_id IS NULL';
    } else if (scope === 'tenant' && tenantId) {
      workQuery += ' AND tenant_id = $3';
      params.push(tenantId);
    }
    
    workQuery += ' ORDER BY score DESC LIMIT $' + (params.length + 1);
    params.push(limit);
    
    searches.push({ type: 'work', query: workQuery, params });
  }
  
  const results = [];
  
  for (const search of searches) {
    try {
      const { rows } = await pool.query(search.query, search.params);
      
      console.log(`[Keyword] ${search.type}: ${rows.length} rows returned`);
      
      results.push(...rows.map(row => ({
        id: `${row.scope}-${row.type}-${row.db_id}`,
        type: row.type,
        dbId: row.db_id,
        text: `${row.name}. ${row.category || ''}. ${row.key || ''}. ${row.supplier || ''}. ${row.unit || ''}`,
        score: row.score || 0.5,
        source: 'keyword',
        metadata: {
          category: row.category,
          supplier: row.supplier,
          unit: row.unit,
          scope: row.scope
        }
      })));
    } catch (error) {
      console.error(`❌ [Hybrid] Keyword search error for ${search.type}:`, error.message);
      console.error(`Query:`, search.query);
      console.error(`Params:`, search.params);
    }
  }
  
  console.log(`[Keyword] Total results: ${results.length}`);
  
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Hybrid search: объединяет keyword и semantic результаты
 */
export async function hybridSearch(query, options = {}) {
  const {
    type = 'all',
    scope = 'all',
    tenantId,
    limit = 10,
    debug = false
  } = options;
  
  console.log(`🔍 [Hybrid] Query: "${query}" | Type: ${type} | Scope: ${scope}`);
  
  // Определяем стратегию
  const strategy = getSearchStrategy(query);
  console.log(`📊 [Hybrid] Strategy: ${strategy.mode} (keyword: ${strategy.keywordWeight}, semantic: ${strategy.semanticWeight})`);
  
  // Запускаем оба поиска параллельно
  const [keywordResults, semanticResults] = await Promise.all([
    keywordSearch(query, { type, scope, tenantId, limit: limit * 3 }),
    pineconeClient.search(query, { 
      topK: limit * 3, 
      filter: buildPineconeFilter(type, scope, tenantId)
    })
  ]);
  
  console.log(`✅ [Hybrid] Keyword: ${keywordResults.length} results, Semantic: ${semanticResults.length} results`);
  
  // Debug: показываем top-3 из каждого источника
  if (debug || keywordResults.length > 0) {
    console.log(`[DEBUG] Keyword top-3:`, keywordResults.slice(0, 3).map(r => ({
      type: r.type,
      dbId: r.dbId,
      score: r.score.toFixed(3),
      text: r.text.substring(0, 50)
    })));
    console.log(`[DEBUG] Semantic top-3:`, semanticResults.slice(0, 3).map(r => ({
      type: r.metadata?.type,
      dbId: r.metadata?.dbId,
      score: r.score.toFixed(3),
      text: (r.metadata?.text || r.text || '').substring(0, 50)
    })));
  }
  
  // Объединяем результаты с весами
  const merged = mergeResults(
    keywordResults,
    semanticResults,
    strategy.keywordWeight,
    strategy.semanticWeight,
    debug
  );
  
  console.log(`✅ [Hybrid] Merged: ${merged.length} results after weighting`);
  
  if (debug) {
    console.log(`[DEBUG] Merged top-3:`, merged.slice(0, 3).map(r => ({
      type: r.type,
      dbId: r.dbId,
      score: r.score.toFixed(3),
      sources: r.sources
    })));
  }
  
  // Дедупликация по dbId
  const deduplicated = deduplicateResults(merged);
  
  console.log(`✅ [Hybrid] Final: ${deduplicated.length} results after dedup`);
  
  return deduplicated.slice(0, limit);
}

/**
 * Построение фильтра для Pinecone
 */
function buildPineconeFilter(type, scope, tenantId) {
  const filter = {};
  
  if (type && type !== 'all') {
    filter.type = type;
  }
  
  if (scope === 'global') {
    filter.isGlobal = true;
  } else if (scope === 'tenant' && tenantId) {
    filter.tenantId = tenantId;
  }
  
  return Object.keys(filter).length > 0 ? filter : undefined;
}

/**
 * Объединение и нормализация результатов
 */
function mergeResults(keywordResults, semanticResults, keywordWeight, semanticWeight, debug = false) {
  const resultsMap = new Map();
  
  // Добавляем keyword результаты
  for (const result of keywordResults) {
    const key = `${result.type}:${result.dbId}`; // Унифицированный ключ
    resultsMap.set(key, {
      ...result,
      score: result.score * keywordWeight,
      sources: ['keyword']
    });
  }
  
  if (debug) {
    console.log(`[DEBUG] After keyword: ${resultsMap.size} unique items`);
  }
  
  // Добавляем/обновляем semantic результаты
  for (const result of semanticResults) {
    // Извлекаем type и dbId из metadata
    const resType = result.metadata?.type || result.type;
    const resDbId = result.metadata?.dbId || result.dbId;
    
    if (!resType || !resDbId) {
      console.warn(`[Hybrid] Skipping semantic result without type/dbId:`, result.id);
      continue;
    }
    
    const key = `${resType}:${resDbId}`; // Унифицированный ключ
    
    if (resultsMap.has(key)) {
      // Объект найден в обоих - усиливаем score
      const existing = resultsMap.get(key);
      existing.score += result.score * semanticWeight;
      existing.sources.push('semantic');
      
      if (debug) {
        console.log(`[DEBUG] Combined: ${key} | keyword+semantic = ${existing.score.toFixed(3)}`);
      }
    } else {
      // Только semantic
      resultsMap.set(key, {
        id: result.id,
        type: resType,
        dbId: resDbId,
        text: result.metadata?.text || result.text,
        score: result.score * semanticWeight,
        source: 'semantic',
        sources: ['semantic'],
        metadata: result.metadata || {
          category: null,
          supplier: null,
          unit: null
        }
      });
    }
  }
  
  if (debug) {
    console.log(`[DEBUG] After semantic: ${resultsMap.size} unique items`);
  }
  
  // Сортируем по финальному score
  return Array.from(resultsMap.values())
    .sort((a, b) => b.score - a.score);
}

/**
 * Дедупликация результатов
 */
function deduplicateResults(results) {
  const seen = new Set();
  const deduplicated = [];
  
  for (const result of results) {
    const key = `${result.type}:${result.dbId}`; // ИСПРАВЛЕНО: используем тот же формат, что в merge
    
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(result);
    }
  }
  
  return deduplicated;
}

export default {
  hybridSearch,
  keywordSearch,
  getSearchStrategy
};
