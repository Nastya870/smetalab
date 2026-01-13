import axiosInstance from 'utils/axiosInstance';

const workCompletionActsAPI = {
  /**
   * Сгенерировать акт(ы) выполненных работ
   * @param {Object} data - Данные для генерации
   * @param {string} data.estimateId - ID сметы
   * @param {string} data.projectId - ID проекта
   * @param {string} data.actType - Тип акта: 'client' | 'specialist' | 'both'
   * @returns {Promise<Object|Array>} Сгенерированный акт или массив актов (если actType='both')
   */
  generateActs: async ({ estimateId, projectId, actType = 'both' }) => {
    const startTime = Date.now();

    const response = await axiosInstance.post('/work-completion-acts/generate', {
      estimateId,
      projectId,
      actType
    });

    const duration = Date.now() - startTime;
    const result = response.data;

    return result;
  },

  /**
   * Получить все акты для сметы
   * @param {string} estimateId - ID сметы
   * @returns {Promise<Array>} Массив актов с метаданными (workCount, totalAmount, status)
   */
  getActsByEstimate: async (estimateId) => {
    const response = await axiosInstance.get(`/work-completion-acts/estimate/${estimateId}`);
    // ✅ Возвращаем массив актов из объекта response
    return response.data.acts || [];
  },

  /**
   * Получить детали акта со всеми позициями (сгруппированными по разделам)
   * @param {string} actId - ID акта
   * @returns {Promise<Object>} Акт с полными данными (items grouped by section)
   */
  getActById: async (actId) => {
    const response = await axiosInstance.get(`/work-completion-acts/${actId}`);
    return response.data;
  },

  /**
   * Удалить акт
   * @param {string} actId - ID акта
   * @returns {Promise<Object>} Результат удаления
   */
  deleteAct: async (actId) => {
    const response = await axiosInstance.delete(`/work-completion-acts/${actId}`);
    return response.data;
  },

  /**
   * Обновить статус акта
   * @param {string} actId - ID акта
   * @param {string} status - Новый статус: 'draft' | 'pending' | 'approved' | 'paid'
   * @returns {Promise<Object>} Обновленный акт
   */
  updateActStatus: async (actId, status) => {
    const response = await axiosInstance.patch(`/work-completion-acts/${actId}/status`, { status });
    return response.data;
  },

  /**
   * Получить данные для формы КС-2
   * @param {string} actId - ID акта
   * @returns {Promise<Object>} Данные формы КС-2 (ОКУД 0322005)
   */
  getFormKS2: async (actId) => {
    const response = await axiosInstance.get(`/work-completion-acts/${actId}/ks2`);
    return response.data;
  },

  /**
   * Получить данные для формы КС-3
   * @param {string} actId - ID акта
   * @returns {Promise<Object>} Данные формы КС-3 (ОКУД 0322006) с накопительными итогами
   */
  getFormKS3: async (actId) => {
    const response = await axiosInstance.get(`/work-completion-acts/${actId}/ks3`);
    return response.data;
  },

  /**
   * Обновить детали акта (контрагенты, договор, объект)
   * @param {string} actId - ID акта
   * @param {Object} details - Данные для обновления
   * @returns {Promise<Object>} Обновленный акт
   */
  updateActDetails: async (actId, details) => {
    const response = await axiosInstance.patch(`/work-completion-acts/${actId}/details`, details);
    return response.data;
  },

  /**
   * Обновить подписантов акта
   * @param {string} actId - ID акта
   * @param {Array} signatories - Массив подписантов
   * @returns {Promise<Object>} Результат обновления
   */
  updateSignatories: async (actId, signatories) => {
    const response = await axiosInstance.post(`/work-completion-acts/${actId}/signatories`, { signatories });
    return response.data;
  },

  /**
   * Экспортировать выполненные работы в CSV
   */
  exportCompletions: async (estimateId) => {
    const response = await axiosInstance.get(`/work-completions/${estimateId}/export`, {
      responseType: 'blob'
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Выполнение_${estimateId}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Импортировать выполненные работы из CSV
   */
  importCompletions: async (estimateId, file, mode = 'add') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);

    const response = await axiosInstance.post(`/work-completions/${estimateId}/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  }
};

export default workCompletionActsAPI;
