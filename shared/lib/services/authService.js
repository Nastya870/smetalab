/**
 * Authentication Service
 * Взаимодействие с API аутентификации
 */

// API URL: в разработке - localhost, в production - Render backend
const isProduction = typeof window !== 'undefined' && 
                     (window.location.hostname.includes('vercel.app') || 
                      window.location.hostname.includes('smeta-lab.ru'));

const API_BASE_URL = isProduction
  ? 'https://smetalab-backend.onrender.com/api'
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

console.log('🔧 authService API_BASE_URL:', API_BASE_URL);

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
      localStorage.setItem('accessToken', result.data.tokens.accessToken);
      localStorage.setItem('refreshToken', result.data.tokens.refreshToken);
    }

    // Сохраняем данные пользователя
    if (result.data?.user) {
      localStorage.setItem('user', JSON.stringify(result.data.user));
    }

    // Сохраняем данные компании
    if (result.data?.tenant) {
      localStorage.setItem('tenant', JSON.stringify(result.data.tenant));
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
      localStorage.setItem('accessToken', result.data.tokens.accessToken);
      localStorage.setItem('refreshToken', result.data.tokens.refreshToken);
    }

    // Сохраняем данные пользователя
    if (result.data?.user) {
      localStorage.setItem('user', JSON.stringify(result.data.user));
    }

    // Сохраняем текущую компанию
    if (result.data?.tenant) {
      localStorage.setItem('tenant', JSON.stringify(result.data.tenant));
    }

    // Сохраняем список всех компаний
    if (result.data?.tenants) {
      localStorage.setItem('tenants', JSON.stringify(result.data.tenants));
    }

    // Сохраняем роли
    if (result.data?.roles) {
      localStorage.setItem('roles', JSON.stringify(result.data.roles));
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
    const refreshToken = localStorage.getItem('refreshToken');

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
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
    localStorage.removeItem('tenants');
    localStorage.removeItem('roles');
  }
};

/**
 * Обновление access token используя refresh token
 * @returns {Promise<string>} Новый access token
 */
export const refreshAccessToken = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');

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
      localStorage.setItem('accessToken', result.data.accessToken);
    }
    if (result.data?.refreshToken) {
      localStorage.setItem('refreshToken', result.data.refreshToken);
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
    const accessToken = localStorage.getItem('accessToken');

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
  return !!localStorage.getItem('accessToken');
};

/**
 * Получение токена для API запросов
 * @returns {string|null}
 */
export const getAccessToken = () => {
  return localStorage.getItem('accessToken');
};

/**
 * Получение данных пользователя из localStorage
 * @returns {Object|null}
 */
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

/**
 * Получение текущей компании из localStorage
 * @returns {Object|null}
 */
export const getCurrentTenant = () => {
  const tenantStr = localStorage.getItem('tenant');
  return tenantStr ? JSON.parse(tenantStr) : null;
};

/**
 * Получение ролей пользователя из localStorage
 * @returns {Array}
 */
export const getUserRoles = () => {
  const rolesStr = localStorage.getItem('roles');
  return rolesStr ? JSON.parse(rolesStr) : [];
};

/**
 * Получение пути для редиректа после входа
 * @returns {string}
 */
export const getRedirectPath = () => {
  const redirectPath = localStorage.getItem('redirectAfterLogin');
  if (redirectPath) {
    localStorage.removeItem('redirectAfterLogin');
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
