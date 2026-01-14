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

/**
 * Экспортировать график в CSV
 */
export const exportSchedule = async (estimateId) => {
  const response = await axiosInstance.get(`/schedules/estimate/${estimateId}/export`, {
    responseType: 'blob'
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `График_${estimateId}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

/**
 * Импортировать график из CSV
 */
export const importSchedule = async (estimateId, file, mode = 'add') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', mode);

  const response = await axiosInstance.post(`/schedules/estimate/${estimateId}/import`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data;
};

export default {
  generateSchedule,
  getByEstimateId,
  deleteSchedule,
  exportSchedule,
  importSchedule,
  bulkImport: async (estimateId, data) => {
    const response = await axiosInstance.post(`/schedules/estimate/${estimateId}/bulk`, data);
    return response.data;
  }
};
