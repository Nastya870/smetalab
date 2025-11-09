import axiosInstance from 'utils/axiosInstance';

const tenantsAPI = {
  /**
   * Получить данные компании по ID
   * @param {string} id - ID компании
   * @returns {Promise<Object>} Данные компании
   */
  getById: async (id) => {
    const response = await axiosInstance.get(`/tenants/${id}`);
    return response.data.tenant;
  },

  /**
   * Обновить данные компании
   * @param {string} id - ID компании
   * @param {Object} data - Данные для обновления
   * @returns {Promise<Object>} Обновленные данные компании
   */
  update: async (id, data) => {
    const response = await axiosInstance.put(`/tenants/${id}`, data);
    return response.data.tenant;
  },

  /**
   * Загрузить логотип компании
   * @param {string} id - ID компании
   * @param {FormData} formData - FormData с файлом логотипа
   * @returns {Promise<Object>} URL загруженного логотипа
   */
  uploadLogo: async (id, formData) => {
    const response = await axiosInstance.post(`/tenants/${id}/logo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};

export default tenantsAPI;
