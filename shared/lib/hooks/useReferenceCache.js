import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Хук для кэширования данных справочников с поддержкой фильтрации
 * 
 * Особенности:
 * - Загружает данные один раз и кэширует в памяти
 * - Фильтрация происходит на клиенте (мгновенно)
 * - Автоматическая инвалидация кэша при изменениях (create/update/delete)
 * - Поддержка React 18 concurrent rendering
 * 
 * @param {Function} fetchFunction - Функция для загрузки данных с API
 * @param {Object} options - Опции кэширования
 * @param {number} options.ttl - Time to live в миллисекундах (default: 5 минут)
 * @param {string} options.cacheKey - Ключ для localStorage кэша
 * @param {boolean} options.enablePersistence - Сохранять кэш в localStorage (default: false)
 * 
 * @returns {Object} - { data, loading, error, refresh, invalidateCache, filter }
 */
export const useReferenceCache = (fetchFunction, options = {}) => {
  const {
    ttl = 5 * 60 * 1000, // 5 минут по умолчанию
    cacheKey = 'reference-cache',
    enablePersistence = false
  } = options;

  // State
  const [allData, setAllData] = useState([]); // Все данные (кэшированные)
  const [filteredData, setFilteredData] = useState([]); // Отфильтрованные данные
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilters, setActiveFilters] = useState({});

  // Refs для предотвращения race conditions
  const cacheTimestamp = useRef(null);
  const isMounted = useRef(true);
  const fetchInProgress = useRef(false);

  // Загрузка данных из localStorage при монтировании
  useEffect(() => {
    if (enablePersistence) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;
          
          if (age < ttl) {
            console.log(`[CACHE HIT] Loaded ${data.length} items from localStorage (age: ${Math.round(age / 1000)}s)`);
            setAllData(data);
            setFilteredData(data);
            cacheTimestamp.current = timestamp;
            setLoading(false);
            return;
          } else {
            console.log(`[CACHE EXPIRED] Cache age: ${Math.round(age / 1000)}s, TTL: ${Math.round(ttl / 1000)}s`);
            localStorage.removeItem(cacheKey);
          }
        }
      } catch (err) {
        console.warn('[CACHE ERROR] Failed to load from localStorage:', err);
      }
    }
  }, [cacheKey, enablePersistence, ttl]);

  // Функция загрузки данных
  const fetchData = useCallback(async (force = false) => {
    // Предотвращаем дублирование запросов
    if (fetchInProgress.current && !force) {
      console.log('[CACHE] Fetch already in progress, skipping...');
      return;
    }

    // Проверяем валидность кэша
    if (!force && cacheTimestamp.current) {
      const age = Date.now() - cacheTimestamp.current;
      if (age < ttl) {
        console.log(`[CACHE VALID] Using cached data (age: ${Math.round(age / 1000)}s)`);
        return;
      }
    }

    fetchInProgress.current = true;
    setLoading(true);
    setError(null);

    try {
      console.log('[CACHE] Fetching fresh data from API...');
      const startTime = Date.now();
      const response = await fetchFunction();
      const fetchTime = Date.now() - startTime;
      
      // Проверяем, что компонент еще примонтирован (React 18 strict mode)
      if (!isMounted.current) {
        console.log('[CACHE] Component unmounted, discarding fetch result');
        return;
      }

      const data = Array.isArray(response) ? response : (response?.data || []);
      
      console.log(`[CACHE REFRESHED] Loaded ${data.length} items in ${fetchTime}ms`);
      
      setAllData(data);
      setFilteredData(data);
      cacheTimestamp.current = Date.now();

      // Сохраняем в localStorage если включено
      if (enablePersistence) {
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            data,
            timestamp: cacheTimestamp.current
          }));
          console.log('[CACHE] Persisted to localStorage');
        } catch (err) {
          console.warn('[CACHE ERROR] Failed to persist to localStorage:', err);
          // Квота localStorage исчерпана - очищаем старые кэши
          if (err.name === 'QuotaExceededError') {
            localStorage.removeItem(cacheKey);
          }
        }
      }
    } catch (err) {
      console.error('[CACHE ERROR] Failed to fetch data:', err);
      if (isMounted.current) {
        setError(err.message || 'Ошибка загрузки данных');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        fetchInProgress.current = false;
      }
    }
  }, [fetchFunction, cacheKey, enablePersistence, ttl]);

  // Первичная загрузка данных
  useEffect(() => {
    // Если данные уже загружены из localStorage, пропускаем fetch
    if (allData.length > 0 && cacheTimestamp.current) {
      return;
    }
    
    fetchData();
  }, [fetchData, allData.length]);

  // Cleanup при размонтировании
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Функция клиентской фильтрации
  const applyFilters = useCallback((filters) => {
    console.log('[CACHE FILTER] Applying filters:', filters);
    const startTime = Date.now();

    let filtered = [...allData];

    // Применяем каждый фильтр
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        filtered = filtered.filter(item => {
          const itemValue = item[key];
          
          // Для boolean фильтров
          if (typeof value === 'boolean') {
            return itemValue === value;
          }
          
          // Для строковых фильтров (case-insensitive)
          if (typeof value === 'string') {
            return String(itemValue).toLowerCase().includes(value.toLowerCase());
          }
          
          // Для точного совпадения
          return itemValue === value;
        });
      }
    });

    const filterTime = Date.now() - startTime;
    console.log(`[CACHE FILTER] Filtered ${allData.length} → ${filtered.length} items in ${filterTime}ms`);

    setActiveFilters(filters);
    setFilteredData(filtered);
  }, [allData]);

  // Инвалидация кэша (после create/update/delete)
  const invalidateCache = useCallback(() => {
    console.log('[CACHE INVALIDATED] Clearing cache and refetching...');
    cacheTimestamp.current = null;
    if (enablePersistence) {
      localStorage.removeItem(cacheKey);
    }
    fetchData(true); // Форсируем перезагрузку
  }, [cacheKey, enablePersistence, fetchData]);

  // Ручное обновление
  const refresh = useCallback(() => {
    console.log('[CACHE REFRESH] Manual refresh requested');
    fetchData(true);
  }, [fetchData]);

  return {
    // Данные
    data: filteredData,
    allData, // Все данные без фильтров (для статистики)
    
    // Состояние
    loading,
    error,
    
    // Методы
    refresh,
    invalidateCache,
    applyFilters,
    
    // Мета-информация
    cacheAge: cacheTimestamp.current ? Date.now() - cacheTimestamp.current : null,
    isCached: !!cacheTimestamp.current,
    activeFilters
  };
};

/**
 * Пример использования:
 * 
 * const {
 *   data: works,
 *   loading,
 *   error,
 *   applyFilters,
 *   invalidateCache,
 *   refresh
 * } = useReferenceCache(
 *   () => worksAPI.getAll({ pageSize: 20000 }),
 *   {
 *     ttl: 10 * 60 * 1000, // 10 минут
 *     cacheKey: 'works-cache',
 *     enablePersistence: true
 *   }
 * );
 * 
 * // Фильтрация на клиенте (мгновенно)
 * applyFilters({ isGlobal: true });
 * applyFilters({ isGlobal: false, category: 'Кирпич' });
 * 
 * // После создания/обновления/удаления
 * await worksAPI.create(newWork);
 * invalidateCache(); // Перезагрузит данные
 */

export default useReferenceCache;
