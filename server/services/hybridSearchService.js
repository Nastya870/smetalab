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
 * Keyword поиск через PostgreSQL (tsvector + pg_trgm)
 */
export async function keywordSearch(query, { type = 'all', scope = 'all', tenantId, limit = 20 }) {
  const searchTerm = query.toLowerCase().trim();
  const searchPattern = `%${searchTerm}%`;
  
  // Определяем таблицы для поиска
  const searches = [];
  
  if (type === 'material' || type === 'all') {
    let materialQuery = `
      SELECT 
        'material' as type,
        id::text as db_id,
        name,
        category,
        supplier,
        unit,
        key,
        COALESCE(tenant_id::text, 'global') as scope,
        similarity(name, $1) + 
        similarity(COALESCE(category, ''), $1) * 0.5 +
        similarity(COALESCE(supplier, ''), $1) * 0.3 as score
      FROM materials
      WHERE 
        (name ILIKE $2 OR category ILIKE $2 OR supplier ILIKE $2 OR key ILIKE $2)
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
    let workQuery = `
      SELECT 
        'work' as type,
        id::text as db_id,
        name,
        category,
        '' as supplier,
        unit,
        key,
        COALESCE(tenant_id::text, 'global') as scope,
        similarity(name, $1) + 
        similarity(COALESCE(category, ''), $1) * 0.5 as score
      FROM works
      WHERE 
        (name ILIKE $2 OR category ILIKE $2 OR key ILIKE $2)
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
      console.error(`❌ [Hybrid] Keyword search error:`, error.message);
    }
  }
  
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
    limit = 10
  } = options;
  
  console.log(`🔍 [Hybrid] Query: "${query}" | Type: ${type} | Scope: ${scope}`);
  
  // Определяем стратегию
  const strategy = getSearchStrategy(query);
  console.log(`📊 [Hybrid] Strategy: ${strategy.mode} (keyword: ${strategy.keywordWeight}, semantic: ${strategy.semanticWeight})`);
  
  // Запускаем оба поиска параллельно
  const [keywordResults, semanticResults] = await Promise.all([
    keywordSearch(query, { type, scope, tenantId, limit: limit * 2 }),
    pineconeClient.search(query, { 
      topK: limit * 2, 
      filter: buildPineconeFilter(type, scope, tenantId)
    })
  ]);
  
  console.log(`✅ [Hybrid] Keyword: ${keywordResults.length} results, Semantic: ${semanticResults.length} results`);
  
  // Объединяем результаты с весами
  const merged = mergeResults(
    keywordResults,
    semanticResults,
    strategy.keywordWeight,
    strategy.semanticWeight
  );
  
  // Дедупликация по dbId
  const deduplicated = deduplicateResults(merged);
  
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
function mergeResults(keywordResults, semanticResults, keywordWeight, semanticWeight) {
  const resultsMap = new Map();
  
  // Добавляем keyword результаты
  for (const result of keywordResults) {
    const key = `${result.type}-${result.dbId}`;
    resultsMap.set(key, {
      ...result,
      score: result.score * keywordWeight,
      sources: ['keyword']
    });
  }
  
  // Добавляем/обновляем semantic результаты
  for (const result of semanticResults) {
    const key = `${result.metadata?.type || result.type}-${result.metadata?.dbId || result.dbId}`;
    
    if (resultsMap.has(key)) {
      // Объект найден в обоих - усиливаем score
      const existing = resultsMap.get(key);
      existing.score += result.score * semanticWeight;
      existing.sources.push('semantic');
    } else {
      // Только semantic
      resultsMap.set(key, {
        id: result.id,
        type: result.metadata?.type || result.type,
        dbId: result.metadata?.dbId || result.dbId,
        text: result.metadata?.text || result.text,
        score: result.score * semanticWeight,
        source: 'semantic',
        sources: ['semantic'],
        metadata: result.metadata
      });
    }
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
    const key = `${result.type}-${result.dbId}`;
    
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
