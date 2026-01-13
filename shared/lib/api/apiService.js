/**
 * API Service
 * Централизованный сервис для всех API запросов с автоматическим обновлением токенов
 */

import axiosInstance from 'utils/axiosInstance';

/**
 * Получение данных текущего пользователя
 */
export const getCurrentUser = async () => {
  try {
    const response = await axiosInstance.get('/auth/me');
    return response.data;
  } catch (error) {
    console.error('Get current user error:', error);
    throw error;
  }
};

/**
 * Отправка письма подтверждения email
 */
export const sendVerificationEmail = async () => {
  try {
    const response = await axiosInstance.post('/email/send-verification');
    return response.data;
  } catch (error) {
    console.error('Send verification email error:', error);
    throw error;
  }
};

/**
 * Получение статуса подтверждения email
 */
export const getVerificationStatus = async () => {
  try {
    const response = await axiosInstance.get('/email/verification-status');
    return response.data;
  } catch (error) {
    console.error('Get verification status error:', error);
    throw error;
  }
};

/**
 * Обновление профиля пользователя
 */
export const updateProfile = async (data) => {
  try {
    const response = await axiosInstance.put('/users/profile', data);
    return response.data;
  } catch (error) {
    console.error('Update profile error:', error);
    throw error;
  }
};

/**
 * Изменение пароля
 */
export const changePassword = async (data) => {
  try {
    const response = await axiosInstance.post('/users/change-password', data);
    return response.data;
  } catch (error) {
    console.error('Change password error:', error);
    throw error;
  }
};

// Пример защищенных запросов (будут автоматически обновлять токен при 401)

/**
 * Получение списка смет
 */
export const getEstimates = async (params = {}) => {
  try {
    const response = await axiosInstance.get('/estimates', { params });
    return response.data;
  } catch (error) {
    console.error('Get estimates error:', error);
    throw error;
  }
};

/**
 * Создание новой сметы
 */
export const createEstimate = async (data) => {
  try {
    const response = await axiosInstance.post('/estimates', data);
    return response.data;
  } catch (error) {
    console.error('Create estimate error:', error);
    throw error;
  }
};

/**
 * Получение конкретной сметы
 */
export const getEstimate = async (id) => {
  try {
    const response = await axiosInstance.get(`/estimates/${id}`);
    return response.data;
  } catch (error) {
    console.error('Get estimate error:', error);
    throw error;
  }
};

/**
 * Обновление сметы
 */
export const updateEstimate = async (id, data) => {
  try {
    const response = await axiosInstance.put(`/estimates/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Update estimate error:', error);
    throw error;
  }
};

/**
 * Удаление сметы
 */
export const deleteEstimate = async (id) => {
  try {
    const response = await axiosInstance.delete(`/estimates/${id}`);
    return response.data;
  } catch (error) {
    console.error('Delete estimate error:', error);
    throw error;
  }
};

export default {
  // User
  getCurrentUser,
  updateProfile,
  changePassword,
  
  // Email
  sendVerificationEmail,
  getVerificationStatus,
  
  // Estimates
  getEstimates,
  createEstimate,
  getEstimate,
  updateEstimate,
  deleteEstimate
};
