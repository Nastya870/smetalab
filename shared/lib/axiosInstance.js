/**
 * Axios Instance with Auto Token Refresh
 * Автоматически обновляет истекшие access tokens
 */

import axios from 'axios';
import { refreshAccessToken, logout } from 'services/authService';

// Создаем экземпляр axios с базовым URL
const axiosInstance = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Флаг для предотвращения множественных запросов refresh
let isRefreshing = false;
// Очередь запросов, ожидающих обновления токена
let failedQueue = [];

/**
 * Обработка очереди запросов после обновления токена
 */
const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Request interceptor - добавляем токен к каждому запросу
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - обрабатываем ошибку 401 и обновляем токен
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Если ошибка 401 и это не повторный запрос
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Если это запрос на refresh, выходим из системы
      if (originalRequest.url.includes('/auth/refresh')) {
        await logout();
        window.location.href = '/pages/login';
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      // Если токен уже обновляется, добавляем запрос в очередь
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      isRefreshing = true;

      try {
        // Обновляем токен
        const newToken = await refreshAccessToken();
        
        // Обновляем токен в заголовке оригинального запроса
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        
        // Обрабатываем очередь
        processQueue(null, newToken);
        
        // Повторяем оригинальный запрос с новым токеном
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Если обновление токена не удалось, выходим из системы
        processQueue(refreshError, null);
        await logout();
        window.location.href = '/pages/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
