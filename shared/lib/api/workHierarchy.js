/**
 * API клиент для работы с иерархией работ
 */

import axiosInstance from 'utils/axiosInstance';

const workHierarchyAPI = {
  /**
   * Получить элементы иерархии по уровню
   * @param {string} level - 'phase', 'section', 'subsection'
   * @param {string} parent - Значение родительского элемента (для section/subsection)
   */
  getByLevel: (level, parent = null) => {
    const params = { level };
    if (parent) params.parent = parent;
    return axiosInstance.get('/works/hierarchy', { params });
  },

  /**
   * Получить полное дерево иерархии
   */
  getTree: () => {
    return axiosInstance.get('/works/hierarchy/tree');
  },

  /**
   * Получить элемент по ID
   */
  getById: (id) => {
    return axiosInstance.get(`/works/hierarchy/${id}`);
  },

  /**
   * Создать элемент иерархии
   * @param {Object} data - { level, value, parent_value, code, sort_order, is_global }
   */
  create: (data) => {
    return axiosInstance.post('/works/hierarchy', data);
  },

  /**
   * Обновить элемент иерархии
   */
  update: (id, data) => {
    return axiosInstance.put(`/works/hierarchy/${id}`, data);
  },

  /**
   * Удалить элемент иерархии
   */
  delete: (id) => {
    return axiosInstance.delete(`/works/hierarchy/${id}`);
  },

  /**
   * Получить варианты для autocomplete
   * @param {string} level - 'phase', 'section', 'subsection'
   * @param {string} search - Поисковый запрос
   */
  getAutocomplete: (level, search = '') => {
    return axiosInstance.get('/works/hierarchy/autocomplete', {
      params: { level, search }
    });
  },

  /**
   * Получить статистику
   */
  getStatistics: () => {
    return axiosInstance.get('/works/hierarchy/statistics');
  }
};

export default workHierarchyAPI;
