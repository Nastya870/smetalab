/**
 * Authentication Service
 * Взаимодействие с API аутентификации
 */

import storageService from './storageService';

// API URL: в разработке - localhost, в production - Render backend
const isProduction = typeof window !== 'undefined' &&
  (window.location.hostname.includes('vercel.app') ||
    window.location.hostname.includes('smeta-lab.ru'));

const API_BASE_URL = isProduction
  ? 'https://smetalab-backend.onrender.com/api'
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

/**
 * Регистрация нового пользователя и компании
 * @param {Object} data - Данные для регистрации
 * @param {string} data.companyName - Название компании
 * @param {string} data.email - Email пользователя
 * @param {string} data.password - Пароль
 * @param {string} data.fullName - Полное имя
 * @param {string} [data.phone] - Телефон (опционально)
 * @returns {Promise<Object>} Результат регистрации с токенами
 */
export const register = async (data) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Ошибка регистрации');
    }

    // Сохраняем токены в localStorage
    if (result.data?.tokens) {
      storageService.set('accessToken', result.data.tokens.accessToken);
      storageService.set('refreshToken', result.data.tokens.refreshToken);
    }

    // Сохраняем данные пользователя
    if (result.data?.user) {
      storageService.set('user', result.data.user);
    }

    // Сохраняем данные компании
    if (result.data?.tenant) {
      storageService.set('tenant', result.data.tenant);
    }

    return result;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

/**
 * Вход пользователя
 * @param {Object} credentials - Данные для входа
 * @param {string} credentials.email - Email
 * @param {string} credentials.password - Пароль
 * @param {string} [credentials.tenantId] - ID компании (если у пользователя несколько компаний)
 * @returns {Promise<Object>} Результат входа с токенами
 */
export const login = async (credentials) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Ошибка входа');
    }

    // Сохраняем токены
    if (result.data?.tokens) {
      storageService.set('accessToken', result.data.tokens.accessToken);
      storageService.set('refreshToken', result.data.tokens.refreshToken);
    }

    // Сохраняем данные пользователя
    if (result.data?.user) {
      storageService.set('user', result.data.user);
    }

    // Сохраняем текущую компанию
    if (result.data?.tenant) {
      storageService.set('tenant', result.data.tenant);
    }

    // Сохраняем список всех компаний
    if (result.data?.tenants) {
      storageService.set('tenants', result.data.tenants);
    }

    // Сохраняем роли
    if (result.data?.roles) {
      storageService.set('roles', result.data.roles);
    }

    return result;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

/**
 * Выход из системы
 * @returns {Promise<void>}
 */
export const logout = async () => {
  try {
    const refreshToken = storageService.get('refreshToken');

    if (refreshToken) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Очищаем все данные из localStorage
    storageService.remove('accessToken');
    storageService.remove('refreshToken');
    storageService.remove('user');
    storageService.remove('tenant');
    storageService.remove('tenants');
    storageService.remove('roles');
  }
};

/**
 * Обновление access token используя refresh token
 * @returns {Promise<string>} Новый access token
 */
export const refreshAccessToken = async () => {
  try {
    const refreshToken = storageService.get('refreshToken');

    if (!refreshToken) {
      throw new Error('No refresh token');
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to refresh token');
    }

    // Обновляем токены
    if (result.data?.accessToken) {
      storageService.set('accessToken', result.data.accessToken);
    }
    if (result.data?.refreshToken) {
      storageService.set('refreshToken', result.data.refreshToken);
    }

    return result.data.accessToken;
  } catch (error) {
    console.error('Refresh token error:', error);
    // Если не удалось обновить токен, выходим
    await logout();
    throw error;
  }
};

/**
 * Получение информации о текущем пользователе
 * @returns {Promise<Object>} Данные пользователя
 */
export const getMe = async () => {
  try {
    const accessToken = storageService.get('accessToken');

    if (!accessToken) {
      throw new Error('No access token');
    }

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      }
    });

    const result = await response.json();

    if (!response.ok) {
      // Если токен истёк, пробуем обновить
      if (response.status === 401) {
        await refreshAccessToken();
        return getMe(); // Повторный запрос с новым токеном
      }
      throw new Error(result.message || 'Failed to get user data');
    }

    if (result.data) {
      if (result.data.user) storageService.set('user', result.data.user);
      if (result.data.tenant) storageService.set('tenant', result.data.tenant);
      if (result.data.roles) storageService.set('roles', result.data.roles);
    }

    return result.data;
  } catch (error) {
    console.error('Get me error:', error);
    throw error;
  }
};

/**
 * Проверка, авторизован ли пользователь
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  return !!storageService.get('accessToken');
};

/**
 * Получение токена для API запросов
 * @returns {string|null}
 */
export const getAccessToken = () => {
  return storageService.get('accessToken');
};

/**
 * Получение данных пользователя из localStorage
 * @returns {Object|null}
 */
export const getCurrentUser = () => {
  return storageService.get('user');
};

/**
 * Получение текущей компании из localStorage
 * @returns {Object|null}
 */
export const getCurrentTenant = () => {
  return storageService.get('tenant');
};

/**
 * Получение ролей пользователя из localStorage
 * @returns {Array}
 */
export const getUserRoles = () => {
  const roles = storageService.get('roles');
  return roles || [];
};

/**
 * Получение пути для редиректа после входа
 * @returns {string}
 */
export const getRedirectPath = () => {
  const redirectPath = storageService.get('redirectAfterLogin');
  if (redirectPath) {
    storageService.remove('redirectAfterLogin');
    return redirectPath;
  }
  return '/app'; // По умолчанию на dashboard
};

export default {
  register,
  login,
  logout,
  refreshAccessToken,
  getMe,
  isAuthenticated,
  getAccessToken,
  getCurrentUser,
  getCurrentTenant,
  getUserRoles,
  getRedirectPath
};
