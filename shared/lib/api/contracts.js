import axiosInstance from 'utils/axiosInstance';

/**
 * API клиент для работы с договорами
 */
const contractsAPI = {
  /**
   * Получить договор по ID сметы
   * @param {string} estimateId - ID сметы
   * @returns {Promise<Object|null>} Договор или null если не найден
   */
  getContractByEstimate: async (estimateId) => {
    try {
      const response = await axiosInstance.get(`/contracts/estimate/${estimateId}`);
      return response.data.contract || null;
    } catch (error) {
      if (error.response?.status === 404) {
        return null; // Договор не найден
      }
      throw error;
    }
  },

  /**
   * Получить договор по ID
   * @param {string} id - ID договора
   * @returns {Promise<Object>} Договор
   */
  getById: async (id) => {
    const response = await axiosInstance.get(`/contracts/${id}`);
    return response.data.contract;
  },

  /**
   * Сгенерировать договор с автозаполнением
   * @param {Object} data - Данные для генерации
   * @param {string} data.estimateId - ID сметы
   * @param {string} data.projectId - ID проекта
   * @param {string} data.customerId - ID заказчика (физ. лицо)
   * @param {string} data.contractorId - ID подрядчика (юр. лицо)
   * @returns {Promise<Object>} Созданный договор с заполненными данными
   */
  generateContract: async (data) => {
    const response = await axiosInstance.post('/contracts/generate', data);
    return response.data.contract;
  },

  /**
   * Обновить договор
   * @param {string} id - ID договора
   * @param {Object} data - Данные для обновления
   * @returns {Promise<Object>} Обновленный договор
   */
  updateContract: async (id, data) => {
    const response = await axiosInstance.put(`/contracts/${id}`, data);
    return response.data.contract;
  },

  /**
   * Удалить договор
   * @param {string} id - ID договора
   * @returns {Promise<Object>} Результат удаления
   */
  deleteContract: async (id) => {
    const response = await axiosInstance.delete(`/contracts/${id}`);
    return response.data;
  },

  /**
   * Скачать договор в формате DOCX
   * @param {string} id - ID договора
   * @returns {Promise<Blob>} Blob файла DOCX
   */
  getContractDOCX: async (id) => {
    const response = await axiosInstance.get(`/contracts/${id}/docx`, {
      responseType: 'blob'
    });
    return response.data;
  },

  /**
   * Получить данные для автозаполнения договора (без сохранения)
   * Используется для предпросмотра перед генерацией
   * @param {Object} params - Параметры
   * @param {string} params.estimateId - ID сметы
   * @param {string} params.projectId - ID проекта
   * @param {string} params.customerId - ID заказчика
   * @param {string} params.contractorId - ID подрядчика
   * @returns {Promise<Object>} Данные для заполнения плейсхолдеров
   */
  getContractData: async (params) => {
    const response = await axiosInstance.get('/contracts/preview-data', { params });
    return response.data;
  },

  /**
   * Изменить статус договора
   * @param {string} id - ID договора
   * @param {string} status - Новый статус (draft, active, completed, cancelled)
   * @returns {Promise<Object>} Обновленный договор
   */
  updateStatus: async (id, status) => {
    const response = await axiosInstance.patch(`/contracts/${id}/status`, { status });
    return response.data.contract;
  },

  /**
   * Получить все договоры проекта
   * @param {string} projectId - ID проекта
   * @returns {Promise<Array>} Массив договоров
   */
  getContractsByProject: async (projectId) => {
    const response = await axiosInstance.get(`/contracts/project/${projectId}`);
    return response.data.contracts || [];
  }
};

export default contractsAPI;
