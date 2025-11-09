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
    console.log(`[generateActs] Generating ${actType} act(s) for estimate ${estimateId}`);
    const startTime = Date.now();
    
    const response = await axiosInstance.post('/work-completion-acts/generate', {
      estimateId,
      projectId,
      actType
    });
    
    const duration = Date.now() - startTime;
    const result = response.data;
    
    if (Array.isArray(result)) {
      console.log(`[generateActs] ✅ Generated ${result.length} acts in ${duration}ms`);
    } else {
      console.log(`[generateActs] ✅ Generated 1 act in ${duration}ms`);
    }
    
    return result;
  },

  /**
   * Получить все акты для сметы
   * @param {string} estimateId - ID сметы
   * @returns {Promise<Array>} Массив актов с метаданными (workCount, totalAmount, status)
   */
  getActsByEstimate: async (estimateId) => {
    const response = await axiosInstance.get(`/work-completion-acts/estimate/${estimateId}`);
    console.log(`[getActsByEstimate] Loaded ${response.data.count || 0} acts for estimate ${estimateId}`);
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
    console.log(`[getActById] Loaded act ${actId} with ${response.data.items?.length || 0} items`);
    return response.data;
  },

  /**
   * Удалить акт
   * @param {string} actId - ID акта
   * @returns {Promise<Object>} Результат удаления
   */
  deleteAct: async (actId) => {
    const response = await axiosInstance.delete(`/work-completion-acts/${actId}`);
    console.log(`[deleteAct] ✅ Deleted act ${actId}`);
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
    console.log(`[updateActStatus] ✅ Updated act ${actId} status to ${status}`);
    return response.data;
  },

  /**
   * Получить данные для формы КС-2
   * @param {string} actId - ID акта
   * @returns {Promise<Object>} Данные формы КС-2 (ОКУД 0322005)
   */
  getFormKS2: async (actId) => {
    const response = await axiosInstance.get(`/work-completion-acts/${actId}/ks2`);
    console.log(`[getFormKS2] ✅ Loaded KS-2 data for act ${actId}`);
    return response.data;
  },

  /**
   * Получить данные для формы КС-3
   * @param {string} actId - ID акта
   * @returns {Promise<Object>} Данные формы КС-3 (ОКУД 0322006) с накопительными итогами
   */
  getFormKS3: async (actId) => {
    const response = await axiosInstance.get(`/work-completion-acts/${actId}/ks3`);
    console.log(`[getFormKS3] ✅ Loaded KS-3 data for act ${actId}`);
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
    console.log(`[updateActDetails] ✅ Updated act ${actId} details`);
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
    console.log(`[updateSignatories] ✅ Updated ${signatories.length} signatories for act ${actId}`);
    return response.data;
  }
};

export default workCompletionActsAPI;
