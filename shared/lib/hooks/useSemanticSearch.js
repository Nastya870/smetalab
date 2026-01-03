/**
 * Универсальный React хук для Semantic Search (AI-powered)
 * Работает со всеми справочниками: материалы, работы, контрагенты, позиции смет
 * 
 * Использование:
 * const { results, loading, error, search, clear } = useSemanticSearch('materials');
 * search('штукатурка');
 */

import { useState, useCallback } from 'react';
import axiosInstance from 'shared/lib/axiosInstance';

/**
 * @param {string} entity - Тип сущности: 'materials' | 'works' | 'counterparties' | 'estimate_items'
 * @param {object} options - Опции поиска
 * @param {number} options.threshold - Порог similarity (0-1), по умолчанию 0.5
 * @param {number} options.limit - Максимальное количество результатов, по умолчанию 50
 * @param {function} options.onSuccess - Callback при успешном поиске
 * @param {function} options.onError - Callback при ошибке
 */
export const useSemanticSearch = (entity, options = {}) => {
  const { 
    threshold = 0.3,  // Понижен порог с 0.5 до 0.3 (30%)
    limit = 50, 
    onSuccess, 
    onError 
  } = options;

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastQuery, setLastQuery] = useState('');

  /**
   * Выполняет semantic search запрос
   * @param {string} query - Поисковый запрос
   */
  const search = useCallback(async (query) => {
    if (!query || query.trim() === '') {
      setResults([]);
      setLastQuery('');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setLastQuery(query);

      console.log(`🔍 [useSemanticSearch] Searching ${entity}: "${query}"`);

      const response = await axiosInstance.post('/search', {
        entity,
        query: query.trim(),
        threshold,
        limit
      });

      if (response.data.success) {
        setResults(response.data.results);
        onSuccess?.(response.data);
        
        console.log(`✅ [useSemanticSearch] Found ${response.data.found}/${response.data.total} results`);
      } else {
        throw new Error(response.data.message || 'Search failed');
      }
    } catch (err) {
      console.error('❌ [useSemanticSearch] Error:', err);
      setError(err.response?.data?.message || err.message);
      setResults([]);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  }, [entity, threshold, limit, onSuccess, onError]);

  /**
   * Очищает результаты поиска
   */
  const clear = useCallback(() => {
    setResults([]);
    setError(null);
    setLastQuery('');
  }, []);

  return {
    results,
    loading,
    error,
    lastQuery,
    search,
    clear
  };
};

/**
 * Хук для специфичного поиска материалов
 */
export const useSemanticSearchMaterials = (options) => {
  return useSemanticSearch('materials', options);
};

/**
 * Хук для специфичного поиска работ
 */
export const useSemanticSearchWorks = (options) => {
  return useSemanticSearch('works', options);
};

/**
 * Хук для специфичного поиска контрагентов
 */
export const useSemanticSearchCounterparties = (options) => {
  return useSemanticSearch('counterparties', options);
};

/**
 * Хук для специфичного поиска позиций смет
 */
export const useSemanticSearchEstimateItems = (options) => {
  return useSemanticSearch('estimate_items', options);
};

export default useSemanticSearch;
