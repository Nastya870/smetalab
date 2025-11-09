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

export default {
  createGlobalPurchase,
  getAllGlobalPurchases,
  getGlobalPurchaseById,
  updateGlobalPurchase,
  deleteGlobalPurchase,
  getCalendarDates,
  getStatistics
};
