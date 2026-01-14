/**
 * Rate Limiting Middleware
 * 
 * Защита от brute force атак и DDoS
 * 
 * @see OWASP Rate Limiting Guidelines
 */

import rateLimit from 'express-rate-limit';

// Общие настройки для отключения предупреждений IPv6
const commonOptions = {
  validate: false
};

/**
 * Безопасный парсинг лимитов с защитой от 0, отрицательных и невалидных значений
 * @param {string|undefined} value Значение из ENV
 * @param {number} defaultValue Дефолтное значение
 * @returns {number} Валидное число в диапазоне [1, 100000]
 */
const parseRateLimit = (value, defaultValue) => {
  const parsed = parseInt(value);
  if (isNaN(parsed) || parsed <= 0) return defaultValue;
  return Math.min(parsed, 100000); // Верхний предел для защиты от DoS
};

/**
 * Лимит на попытки входа
 * 5 попыток за 15 минут (в тестах отключено)
 */
export const loginLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000, // 15 минут
  max: parseRateLimit(process.env.LOGIN_LIMIT_MAX, 5), // 5 попыток
  skip: (req) => process.env.DISABLE_RATE_LIMITER === 'true', // Отключить в тестах если указано
  message: {
    success: false,
    message: 'Слишком много попыток входа. Попробуйте через 15 минут.',
    code: 'TOO_MANY_LOGIN_ATTEMPTS'
  },
  standardHeaders: true, // Возвращает `RateLimit-*` headers
  legacyHeaders: false, // Отключает `X-RateLimit-*` headers
  skipSuccessfulRequests: true, // Не считать успешные входы
  keyGenerator: (req) => {
    // Используем IP + email для более точного лимитирования
    return `login:${req.ip}:${req.body?.email || 'unknown'}`;
  }
});

/**
 * Лимит на регистрацию
 * 3 регистрации в час с одного IP (в тестах отключено)
 */
export const registerLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 60 * 1000, // 1 час
  max: parseRateLimit(process.env.REGISTER_LIMIT_MAX, 3), // 3 регистрации
  skip: (req) => process.env.DISABLE_RATE_LIMITER === 'true', // Отключить в тестах если указано
  message: {
    success: false,
    message: 'Слишком много регистраций. Попробуйте через час.',
    code: 'TOO_MANY_REGISTRATIONS'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `register:${req.ip}`
});

/**
 * Лимит на сброс пароля
 * 3 запроса в час
 */
export const passwordResetLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 60 * 1000, // 1 час
  max: parseRateLimit(process.env.PASSWORD_RESET_LIMIT_MAX, 3), // 3 запроса
  message: {
    success: false,
    message: 'Слишком много запросов на сброс пароля. Попробуйте через час.',
    code: 'TOO_MANY_PASSWORD_RESET_REQUESTS'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.DISABLE_RATE_LIMITER === 'true',
  keyGenerator: (req) => `password-reset:${req.ip}:${req.body?.email || 'unknown'}`
});

/**
 * Общий лимит на API
 * 100 запросов в минуту
 */
export const apiLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 1000, // 1 минута
  max: parseRateLimit(process.env.RATE_LIMIT_MAX, 100), // Настраиваемый лимит
  message: {
    success: false,
    message: 'Слишком много запросов. Пожалуйста, подождите.',
    code: 'TOO_MANY_REQUESTS'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.DISABLE_RATE_LIMITER === 'true',
  keyGenerator: (req) => `api:${req.ip}`
});

/**
 * Строгий лимит для тяжёлых операций
 * 10 запросов в минуту (export, import, bulk operations)
 */
export const heavyOperationsLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 1000, // 1 минута
  max: parseRateLimit(process.env.HEAVY_LIMIT_MAX, 500), // 500 запросов (адаптировано для чанкового импорта)
  message: {
    success: false,
    message: 'Слишком много запросов на экспорт/импорт. Подождите минуту.',
    code: 'TOO_MANY_HEAVY_OPERATIONS'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.DISABLE_RATE_LIMITER === 'true',
  keyGenerator: (req) => `heavy:${req.ip}`
});

/**
 * Лимит на верификацию email
 * 5 запросов в час
 */
export const emailVerificationLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 60 * 1000, // 1 час
  max: parseRateLimit(process.env.EMAIL_VERIFY_LIMIT_MAX, 5), // 5 запросов
  message: {
    success: false,
    message: 'Слишком много запросов на верификацию. Попробуйте через час.',
    code: 'TOO_MANY_VERIFICATION_REQUESTS'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.DISABLE_RATE_LIMITER === 'true',
  keyGenerator: (req) => `email-verify:${req.ip}`
});

export default {
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  apiLimiter,
  heavyOperationsLimiter,
  emailVerificationLimiter
};
