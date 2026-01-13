import axiosInstance from 'utils/axiosInstance';

/**
 * Сформировать закупки на основе сметы
 * @param {string} estimateId - ID сметы
 * @param {string} projectId - ID проекта
 * @returns {Promise} - Закупки сгруппированные и суммированные по материалам
 */
export const generatePurchases = async (estimateId, projectId) => {
  const response = await axiosInstance.post('/purchases/generate', {
    estimateId,
    projectId
  });
  return response.data;
};

/**
 * Получить закупки по ID сметы
 * @param {string} estimateId - ID сметы
 * @returns {Promise} - Закупки сгруппированные по материалам
 */
export const getByEstimateId = async (estimateId) => {
  const response = await axiosInstance.get(`/purchases/estimate/${estimateId}`);
  return response.data;
};

/**
 * Удалить закупки
 * @param {string} estimateId - ID сметы
 * @returns {Promise} - Подтверждение удаления
 */
export const deletePurchases = async (estimateId) => {
  const response = await axiosInstance.delete(`/purchases/estimate/${estimateId}`);
  return response.data;
};

/**
 * Добавить материал О/Ч в закупки проекта
 * @param {Object} purchaseData - Данные закупки
 * @returns {Promise} - Созданная закупка
 */
export const createExtraCharge = async (purchaseData) => {
  const response = await axiosInstance.post('/purchases/extra-charge', purchaseData);
  return response.data;
};

/**
 * Экспортировать закупки в CSV
 */
export const exportPurchases = async (estimateId) => {
  const response = await axiosInstance.get(`/purchases/estimate/${estimateId}/export`, {
    responseType: 'blob'
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Закупки_${estimateId}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

/**
 * Импортировать закупки из CSV
 */
export const importPurchases = async (estimateId, file, mode = 'add') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', mode);

  const response = await axiosInstance.post(`/purchases/estimate/${estimateId}/import`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data;
};

export default {
  generatePurchases,
  getByEstimateId,
  deletePurchases,
  createExtraCharge,
  exportPurchases,
  importPurchases
};
