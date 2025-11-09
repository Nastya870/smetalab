import axiosInstance from 'utils/axiosInstance';

const emailAPI = {
  /**
   * Отправить письмо подтверждения email
   * @returns {Promise<Object>} Результат отправки
   */
  sendVerification: async () => {
    const response = await axiosInstance.post('/email/send-verification');
    return response.data;
  },

  /**
   * Подтвердить email по токену
   * @param {string} token - Токен верификации
   * @returns {Promise<Object>} Результат подтверждения
   */
  verify: async (token) => {
    const response = await axiosInstance.post('/email/verify', { token });
    return response.data;
  },

  /**
   * Получить статус верификации email
   * @returns {Promise<Object>} Статус верификации
   */
  getVerificationStatus: async () => {
    const response = await axiosInstance.get('/email/verification-status');
    return response.data;
  }
};

export default emailAPI;
