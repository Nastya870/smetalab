import axiosInstance from 'utils/axiosInstance';

/**
 * Создать фактическую закупку
 */
export const createGlobalPurchase = async (purchaseData) => {
  const response = await axiosInstance.post('/global-purchases', purchaseData);
  return response.data;
};

/**
 * Получить все фактические закупки с фильтрацией
 */
export const getAllGlobalPurchases = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.projectId) params.append('projectId', filters.projectId);
  if (filters.estimateId) params.append('estimateId', filters.estimateId);
  if (filters.materialId) params.append('materialId', filters.materialId);
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);

  const response = await axiosInstance.get(`/global-purchases?${params.toString()}`);
  return response.data;
};

/**
 * Получить закупку по ID
 */
export const getGlobalPurchaseById = async (id) => {
  const response = await axiosInstance.get(`/global-purchases/${id}`);
  return response.data;
};

/**
 * Обновить фактическую закупку
 */
export const updateGlobalPurchase = async (id, updateData) => {
  const response = await axiosInstance.put(`/global-purchases/${id}`, updateData);
  return response.data;
};

/**
 * Удалить фактическую закупку
 */
export const deleteGlobalPurchase = async (id) => {
  const response = await axiosInstance.delete(`/global-purchases/${id}`);
  return response.data;
};

/**
 * Получить даты с закупками для календаря
 */
export const getCalendarDates = async (year, month) => {
  const response = await axiosInstance.get('/global-purchases/calendar', {
    params: { year, month }
  });
  return response.data;
};

/**
 * Получить статистику по закупкам
 */
export const getStatistics = async (filters = {}) => {
  const params = {};
  if (filters.projectId) params.projectId = filters.projectId;
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;

  const response = await axiosInstance.get('/global-purchases/statistics', { params });
  return response.data;
};

/**
 * Экспортировать глобальные закупки в CSV
 */
export const exportGlobalPurchases = async () => {
  const response = await axiosInstance.get('/global-purchases/export', {
    responseType: 'blob'
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Все_закупки_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

/**
 * Импортировать глобальные закупки из CSV
 */
export const importGlobalPurchases = async (file, mode = 'add') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', mode);

  const response = await axiosInstance.post('/global-purchases/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data;
};

export default {
  createGlobalPurchase,
  getAllGlobalPurchases,
  getGlobalPurchaseById,
  updateGlobalPurchase,
  deleteGlobalPurchase,
  getCalendarDates,
  getStatistics,
  exportGlobalPurchases,
  importGlobalPurchases
};
