import axiosInstance from 'utils/axiosInstance';

/**
 * Сформировать график на основе сметы
 * @param {string} estimateId - ID сметы
 * @param {string} projectId - ID проекта
 * @returns {Promise} - График сгруппированный по фазам
 */
export const generateSchedule = async (estimateId, projectId) => {
  const response = await axiosInstance.post('/schedules/generate', {
    estimateId,
    projectId
  });
  return response.data;
};

/**
 * Получить график по ID сметы
 * @param {string} estimateId - ID сметы
 * @returns {Promise} - График сгруппированный по фазам
 */
export const getByEstimateId = async (estimateId) => {
  const response = await axiosInstance.get(`/schedules/estimate/${estimateId}`);
  return response.data;
};

/**
 * Удалить график
 * @param {string} estimateId - ID сметы
 * @returns {Promise} - Подтверждение удаления
 */
export const deleteSchedule = async (estimateId) => {
  const response = await axiosInstance.delete(`/schedules/estimate/${estimateId}`);
  return response.data;
};

export default {
  generateSchedule,
  getByEstimateId,
  deleteSchedule
};
