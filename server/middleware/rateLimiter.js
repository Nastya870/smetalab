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
 * Лимит на попытки входа
 * 5 попыток за 15 минут
 */
export const loginLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 5, // 5 попыток
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
 * 3 регистрации в час с одного IP
 */
export const registerLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 60 * 1000, // 1 час
  max: 3, // 3 регистрации
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
  max: 3, // 3 запроса
  message: {
    success: false,
    message: 'Слишком много запросов на сброс пароля. Попробуйте через час.',
    code: 'TOO_MANY_PASSWORD_RESET_REQUESTS'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `password-reset:${req.ip}:${req.body?.email || 'unknown'}`
});

/**
 * Общий лимит на API
 * 100 запросов в минуту
 */
export const apiLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 1000, // 1 минута
  max: 100, // 100 запросов
  message: {
    success: false,
    message: 'Слишком много запросов. Пожалуйста, подождите.',
    code: 'TOO_MANY_REQUESTS'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `api:${req.ip}`
});

/**
 * Строгий лимит для тяжёлых операций
 * 10 запросов в минуту (export, import, bulk operations)
 */
export const heavyOperationsLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 1000, // 1 минута
  max: 10, // 10 запросов
  message: {
    success: false,
    message: 'Слишком много запросов на экспорт/импорт. Подождите минуту.',
    code: 'TOO_MANY_HEAVY_OPERATIONS'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `heavy:${req.ip}`
});

/**
 * Лимит на верификацию email
 * 5 запросов в час
 */
export const emailVerificationLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 60 * 1000, // 1 час
  max: 5, // 5 запросов
  message: {
    success: false,
    message: 'Слишком много запросов на верификацию. Попробуйте через час.',
    code: 'TOO_MANY_VERIFICATION_REQUESTS'
  },
  standardHeaders: true,
  legacyHeaders: false,
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
