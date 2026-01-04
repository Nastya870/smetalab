import axiosInstance from 'utils/axiosInstance';

/**
 * API клиент для умного поиска (Pinecone hybrid search)
 * Комбинирует keyword (PostgreSQL pg_trgm) и semantic (Pinecone) поиск
 */

const searchAPI = {
  /**
   * Поиск материалов с использованием AI
   * @param {string} query - Поисковый запрос
   * @param {Object} options - Параметры поиска
   * @param {number} options.limit - Максимальное количество результатов (default: 20)
   * @param {string} options.scope - 'global' | 'tenant' | 'all' (default: 'all')
   * @returns {Promise<Object>} - { success, results, metadata }
   */
  materials: async (query, options = {}) => {
    try {
      const response = await axiosInstance.post('/search/pinecone', {
        query,
        type: 'material',
        limit: options.limit || 20,
        scope: options.scope || 'all',
        mode: 'auto' // Автоопределение: hybrid для коротких, semantic для длинных
      });
      return response.data;
    } catch (error) {
      console.error('❌ [SearchAPI] Materials search failed:', error);
      throw error;
    }
  },

  /**
   * Поиск работ с использованием AI
   * @param {string} query - Поисковый запрос
   * @param {Object} options - Параметры поиска
   * @param {number} options.limit - Максимальное количество результатов (default: 20)
   * @param {string} options.scope - 'global' | 'tenant' | 'all' (default: 'all')
   * @returns {Promise<Object>} - { success, results, metadata }
   */
  works: async (query, options = {}) => {
    try {
      const response = await axiosInstance.post('/search/pinecone', {
        query,
        type: 'work',
        limit: options.limit || 20,
        scope: options.scope || 'all',
        mode: 'auto'
      });
      return response.data;
    } catch (error) {
      console.error('❌ [SearchAPI] Works search failed:', error);
      throw error;
    }
  },

  /**
   * Универсальный поиск (материалы + работы)
   * @param {string} query - Поисковый запрос
   * @param {Object} options - Параметры поиска
   * @returns {Promise<Object>} - { success, results, metadata }
   */
  all: async (query, options = {}) => {
    try {
      const response = await axiosInstance.post('/search/pinecone', {
        query,
        type: 'all',
        limit: options.limit || 20,
        scope: options.scope || 'all',
        mode: 'auto'
      });
      return response.data;
    } catch (error) {
      console.error('❌ [SearchAPI] Search failed:', error);
      throw error;
    }
  }
};

export default searchAPI;
