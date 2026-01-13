/**
 * Кеш для глобальных справочников (materials, works)
 * TTL = 1 час (3600 секунд)
 * Инвалидация при create/update/delete операциях
 */

import NodeCache from 'node-cache';

// Создаём инстанс кеша с TTL 1 час
const cache = new NodeCache({ 
  stdTTL: 3600, // 1 час в секундах
  checkperiod: 600, // Проверка устаревших записей каждые 10 минут
  useClones: false // Для производительности - не клонируем объекты
});

// Ключи кеша
const CACHE_KEYS = {
  GLOBAL_MATERIALS: 'global_materials',
  GLOBAL_WORKS: 'global_works',
  ALL_MATERIALS: 'all_materials',
  ALL_WORKS: 'all_works'
};

/**
 * Получить глобальные материалы из кеша или БД
 */
async function getCachedGlobalMaterials(fetchFunction) {
  const cached = cache.get(CACHE_KEYS.GLOBAL_MATERIALS);
  
  if (cached) {
    console.log('✅ Cache HIT: global_materials');
    return cached;
  }
  
  console.log('❌ Cache MISS: global_materials - fetching from DB');
  const data = await fetchFunction();
  cache.set(CACHE_KEYS.GLOBAL_MATERIALS, data);
  
  return data;
}

/**
 * Получить глобальные работы из кеша или БД
 */
async function getCachedGlobalWorks(fetchFunction) {
  const cached = cache.get(CACHE_KEYS.GLOBAL_WORKS);
  
  if (cached) {
    console.log('✅ Cache HIT: global_works');
    return cached;
  }
  
  console.log('❌ Cache MISS: global_works - fetching from DB');
  const data = await fetchFunction();
  cache.set(CACHE_KEYS.GLOBAL_WORKS, data);
  
  return data;
}

/**
 * Получить все материалы из кеша или БД
 */
async function getCachedAllMaterials(fetchFunction, tenantId) {
  const key = `${CACHE_KEYS.ALL_MATERIALS}_${tenantId}`;
  const cached = cache.get(key);
  
  if (cached) {
    console.log(`✅ Cache HIT: all_materials (tenant: ${tenantId})`);
    return cached;
  }
  
  console.log(`❌ Cache MISS: all_materials (tenant: ${tenantId}) - fetching from DB`);
  const data = await fetchFunction();
  cache.set(key, data);
  
  return data;
}

/**
 * Получить все работы из кеша или БД
 */
async function getCachedAllWorks(fetchFunction, tenantId) {
  const key = `${CACHE_KEYS.ALL_WORKS}_${tenantId}`;
  const cached = cache.get(key);
  
  if (cached) {
    console.log(`✅ Cache HIT: all_works (tenant: ${tenantId})`);
    return cached;
  }
  
  console.log(`❌ Cache MISS: all_works (tenant: ${tenantId}) - fetching from DB`);
  const data = await fetchFunction();
  cache.set(key, data);
  
  return data;
}

/**
 * Инвалидировать кеш материалов
 */
function invalidateMaterialsCache(tenantId = null) {
  console.log('🗑️ Invalidating materials cache...');
  
  // Очищаем глобальный кеш
  cache.del(CACHE_KEYS.GLOBAL_MATERIALS);
  
  // Если указан tenantId, очищаем кеш конкретного тенанта
  if (tenantId) {
    cache.del(`${CACHE_KEYS.ALL_MATERIALS}_${tenantId}`);
  } else {
    // Иначе очищаем весь кеш материалов
    const keys = cache.keys().filter(key => key.startsWith(CACHE_KEYS.ALL_MATERIALS));
    cache.del(keys);
  }
}

/**
 * Инвалидировать кеш работ
 */
function invalidateWorksCache(tenantId = null) {
  console.log('🗑️ Invalidating works cache...');
  
  // Очищаем глобальный кеш
  cache.del(CACHE_KEYS.GLOBAL_WORKS);
  
  // Если указан tenantId, очищаем кеш конкретного тенанта
  if (tenantId) {
    cache.del(`${CACHE_KEYS.ALL_WORKS}_${tenantId}`);
  } else {
    // Иначе очищаем весь кеш работ
    const keys = cache.keys().filter(key => key.startsWith(CACHE_KEYS.ALL_WORKS));
    cache.del(keys);
  }
}

/**
 * Очистить весь кеш (для тестирования)
 */
function clearAllCache() {
  console.log('🗑️ Clearing ALL cache...');
  cache.flushAll();
}

/**
 * Получить статистику кеша
 */
function getCacheStats() {
  return {
    keys: cache.keys(),
    stats: cache.getStats()
  };
}

export {
  getCachedGlobalMaterials,
  getCachedGlobalWorks,
  getCachedAllMaterials,
  getCachedAllWorks,
  invalidateMaterialsCache,
  invalidateWorksCache,
  clearAllCache,
  getCacheStats
};
