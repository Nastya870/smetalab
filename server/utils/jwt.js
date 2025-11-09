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
const REFRESH_TOKEN_EXPIRES = '30d'; // 30 дней

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
export const generateTokens = (userId, tenantId, email, roles = [], emailVerified = false) => {
  // Проверяем, есть ли роль super_admin
  const isSuperAdmin = roles.some(r => r.key === 'super_admin' || r.key === 'superadmin');
  
  const accessToken = generateAccessToken({
    userId,
    tenantId,
    email,
    emailVerified,
    isSuperAdmin,
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
 */
export const getRefreshTokenExpiration = () => {
  const now = new Date();
  now.setDate(now.getDate() + 30); // + 30 дней
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
