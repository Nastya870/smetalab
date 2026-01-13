import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Загружаем .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'your-access-token-secret-change-in-production';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-token-secret-change-in-production';

const ACCESS_TOKEN_EXPIRES = '15m'; // 15 минут
const REFRESH_TOKEN_EXPIRES_DEFAULT = '30d'; // 30 дней
const REFRESH_TOKEN_EXPIRES_REMEMBER_ME = '48h'; // 48 часов для "запомнить меня"

/**
 * Генерирует Access Token
 */
export const generateAccessToken = (payload) => {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES
  });
};

/**
 * Генерирует Refresh Token
 */
export const generateRefreshToken = () => {
  return uuidv4();
};

/**
 * Генерирует пару токенов
 */
export const generateTokens = (userId, tenantId, email, roles = [], emailVerified = false, permissions = []) => {
  // Проверяем, есть ли роль super_admin
  const isSuperAdmin = roles.some(r => r.key === 'super_admin' || r.key === 'superadmin');
  
  // Получаем ключ первой роли (для разграничения прав доступа)
  const roleKey = roles.length > 0 ? roles[0].key : null;
  
  // Формируем массив разрешений для токена (key, resource, action)
  const permissionsPayload = permissions.map(p => ({
    key: p.key,
    resource: p.resource,
    action: p.action
  }));
  
  const accessToken = generateAccessToken({
    userId,
    tenantId,
    email,
    emailVerified,
    isSuperAdmin,
    roleKey, // Добавляем ключ роли для проверки прав
    permissions: permissionsPayload, // ✨ Добавляем разрешения в токен
    type: 'access'
  });

  const refreshToken = generateRefreshToken();

  return {
    accessToken,
    refreshToken,
    expiresIn: 900 // 15 минут в секундах
  };
};

/**
 * Проверяет Access Token
 */
export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET);
  } catch (error) {
    console.log('🔍 JWT verification error:', error.name, error.message);
    if (error.name === 'TokenExpiredError') {
      throw new Error('TOKEN_EXPIRED');
    }
    throw new Error('INVALID_TOKEN');
  }
};

/**
 * Декодирует токен без проверки (для получения payload из истекшего токена)
 */
export const decodeToken = (token) => {
  return jwt.decode(token);
};

/**
 * Вычисляет дату истечения refresh токена
 * @param {boolean} rememberMe - Флаг "запомнить меня" (48 часов вместо 30 дней)
 */
export const getRefreshTokenExpiration = (rememberMe = false) => {
  const now = new Date();
  if (rememberMe) {
    now.setHours(now.getHours() + 48); // + 48 часов
  } else {
    now.setDate(now.getDate() + 30); // + 30 дней
  }
  return now;
};

export default {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyAccessToken,
  decodeToken,
  getRefreshTokenExpiration
};
