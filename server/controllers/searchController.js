/**
 * Универсальный контроллер для Semantic Search
 * Работает со всеми справочниками через единый endpoint
 */

import db from '../config/database.js';
import { semanticSearch } from '../services/semanticSearchService.js';
import { catchAsync, BadRequestError } from '../utils/errors.js';

/**
 * Универсальный semantic search endpoint
 * POST /api/search
 * 
 * Body:
 * {
 *   "entity": "materials" | "works" | "counterparties" | "estimate_items",
 *   "query": "поисковый запрос",
 *   "threshold": 0.5,
 *   "limit": 50
 * }
 */
export const universalSemanticSearch = catchAsync(async (req, res) => {
  const { entity, query, threshold = 0.5, limit = 50 } = req.body;
  const tenantId = req.user?.tenantId;

  if (!entity) {
    throw new BadRequestError('Не указан тип сущности (entity)');
  }

  if (!query || query.trim() === '') {
    throw new BadRequestError('Поисковый запрос не может быть пустым');
  }

  console.log(`🔍 [Universal Search] Entity: ${entity}, Query: "${query}", Tenant: ${tenantId || 'global'}`);

  // Определяем конфигурацию для каждого типа сущности
  const entityConfig = {
    materials: {
      table: 'materials',
      fields: 'id, sku, name, category, unit, price, supplier, weight, is_global',
      searchField: 'name',
      tenantFilter: true
    },
    works: {
      table: 'works',
      fields: 'id, code, name, category, unit, price, is_global',
      searchField: 'name',
      tenantFilter: true
    },
    counterparties: {
      table: 'counterparties',
      fields: 'id, name, entity_type, inn, address, phone, email',
      searchField: 'name',
      tenantFilter: true
    },
    estimate_items: {
      table: 'estimate_items ei JOIN estimates e ON ei.estimate_id = e.id',
      fields: 'ei.id, ei.description, ei.quantity, ei.unit, ei.price, ei.estimate_id, e.name as estimate_name',
      searchField: 'description',
      tenantFilter: true,
      tableName: 'estimate_items ei'
    }
  };

  const config = entityConfig[entity];
  if (!config) {
    throw new BadRequestError(`Неизвестный тип сущности: ${entity}. Допустимые: ${Object.keys(entityConfig).join(', ')}`);
  }

  // Строим SQL запрос
  let sqlQuery = `
    SELECT ${config.fields}
    FROM ${config.table}
  `;

  const params = [];
  const whereClauses = [];

  // Фильтрация по tenant
  if (config.tenantFilter) {
    if (entity === 'estimate_items') {
      whereClauses.push('(e.tenant_id = $1)');
    } else if (entity === 'materials' || entity === 'works') {
      whereClauses.push('(is_global = TRUE OR tenant_id = $1)');
    } else {
      whereClauses.push('(tenant_id = $1)');
    }
    params.push(tenantId);
  }

  if (whereClauses.length > 0) {
    sqlQuery += ` WHERE ${whereClauses.join(' AND ')}`;
  }

  sqlQuery += ' LIMIT 10000';

  // Загружаем данные
  console.log(`📦 [Universal Search] Loading ${entity} data...`);
  const result = await db.query(sqlQuery, params);
  const items = result.rows;

  console.log(`📦 [Universal Search] Loaded ${items.length} ${entity} records`);

  // Выполняем semantic search
  const searchResults = await semanticSearch(
    query,
    items,
    config.searchField,
    threshold,
    limit
  );

  res.status(200).json({
    success: true,
    entity,
    query,
    total: items.length,
    found: searchResults.length,
    threshold,
    results: searchResults.map(item => ({
      ...item,
      similarity: Math.round(item.similarity * 100) / 100
    }))
  });
});

export default {
  universalSemanticSearch
};
