import axiosInstance from 'utils/axiosInstance';

const estimatesAPI = {
  /**
   * Получить все сметы (с фильтрацией)
   */
  getAll: async (params = {}) => {
    const response = await axiosInstance.get('/estimates', { params });
    return response.data;
  },

  /**
   * Получить все сметы проекта
   * @param {string} projectId - ID проекта
   * @returns {Promise<Array>} Массив смет проекта
   */
  getByProjectId: async (projectId) => {
    const response = await axiosInstance.get('/estimates', {
      params: { projectId }
    });
    return response.data;
  },

  /**
   * Получить смету по ID с полными данными (позиции + материалы)
   */
  getById: async (id) => {
    const response = await axiosInstance.get(`/estimates/${id}/full`);
    return response.data;
  },

  /**
   * Создать новую смету
   * @param {Object} data - Данные сметы
   * @param {string} data.name - Название сметы
   * @param {string} data.projectId - ID проекта
   * @param {string} data.estimateType - Тип сметы
   * @param {Array} data.items - Массив позиций сметы (с материалами)
   */
  create: async (data) => {
    const response = await axiosInstance.post('/estimates/full', data);
    return response.data;
  },

  /**
   * Обновить смету
   */
  update: async (id, data) => {
    const response = await axiosInstance.put(`/estimates/${id}`, data);
    return response.data;
  },

  /**
   * Обновить смету с позициями (полная перезапись items)
   * @param {string} id - ID сметы
   * @param {Object} data - Данные сметы с items
   */
  updateWithItems: async (id, data) => {
    // 1. Обновляем основную информацию о смете
    const estimateData = { ...data };
    delete estimateData.items; // Удаляем items из основных данных

    await axiosInstance.put(`/estimates/${id}`, estimateData);

    // 2. Заменяем все позиции одним запросом (DELETE + INSERT в одной транзакции)
    const response = await axiosInstance.put(`/estimates/${id}/items/replace`, {
      items: data.items || []
    });

    // 3. Возвращаем обновленную смету
    const fullEstimate = await axiosInstance.get(`/estimates/${id}/full`);
    return fullEstimate.data;
  },

  /**
   * Удалить смету
   */
  delete: async (id) => {
    const response = await axiosInstance.delete(`/estimates/${id}`);
    return response.data;
  },

  /**
   * Получить позиции сметы
   */
  getItems: async (estimateId) => {
    const response = await axiosInstance.get(`/estimates/${estimateId}/items`);
    return response.data;
  },

  /**
   * Получить материалы для позиции сметы
   */
  getItemMaterials: async (itemId) => {
    const response = await axiosInstance.get(`/estimate-items/${itemId}/materials`);
    return response.data;
  },

  /**
   * Получить данные о выполненных работах для сметы
   */
  getWorkCompletions: async (estimateId) => {
    const response = await axiosInstance.get(`/estimates/${estimateId}/work-completions`);
    return response.data;
  },

  /**
   * Сохранить/обновить выполнение работы
   */
  saveWorkCompletion: async (estimateId, data) => {
    const response = await axiosInstance.post(`/estimates/${estimateId}/work-completions`, data);
    return response.data;
  },

  /**
   * Пакетное сохранение выполненных работ
   */
  batchSaveWorkCompletions: async (estimateId, completions) => {
    const response = await axiosInstance.post(`/estimates/${estimateId}/work-completions/batch`, {
      completions
    });
    return response.data;
  },

  /**
   * Удалить запись о выполнении работы
   */
  deleteWorkCompletion: async (estimateId, estimateItemId) => {
    const response = await axiosInstance.delete(`/estimates/${estimateId}/work-completions/${estimateItemId}`);
    return response.data;
  },

  /**
   * Экспортировать смету в CSV
   */
  exportEstimate: async (estimateId) => {
    const response = await axiosInstance.get(`/estimates/${estimateId}/export`, {
      responseType: 'blob'
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Смета_${estimateId}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Удалить все позиции сметы
   */
  deleteAllItems: async (estimateId) => {
    const response = await axiosInstance.delete(`/estimates/${estimateId}/items/all`);
    return response.data;
  },

  /**
   * Импортировать позиции в смету (JSON bulk)
   */
  importEstimate: async (estimateId, file, mode = 'add') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);

    const response = await axiosInstance.post(`/estimates/${estimateId}/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  },

  /**
   * Массовый импорт позиций в смету (JSON)
   */
  bulkImportItems: async (estimateId, data) => {
    const response = await axiosInstance.post(`/estimates/${estimateId}/bulk`, data);
    return response.data;
  }
};

export default estimatesAPI;
