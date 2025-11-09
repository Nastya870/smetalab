import { verifyAccessToken } from '../utils/jwt.js';

/**
 * Middleware для проверки JWT токена
 */
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    console.log('❌ Auth: No token provided for', req.method, req.path);
    return res.status(401).json({
      success: false,
      message: 'Токен не предоставлен'
    });
  }

  try {
    const payload = verifyAccessToken(token);
    
    // Добавляем информацию о пользователе в request
    req.user = {
      userId: payload.userId,
      tenantId: payload.tenantId,
      email: payload.email,
      isSuperAdmin: payload.isSuperAdmin || false
    };

    console.log('✅ Auth: User authenticated', req.method, req.path, req.user.email);
    next();
  } catch (error) {
    console.log('❌ Auth error for', req.method, req.path, ':', error.message);
    
    if (error.message === 'TOKEN_EXPIRED') {
      return res.status(401).json({
        success: false,
        message: 'Токен истёк',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(403).json({
      success: false,
      message: 'Недействительный токен',
      error: error.message
    });
  }
};

/**
 * Опциональная аутентификация (не выбрасывает ошибку если токена нет)
 */
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      userId: payload.userId,
      tenantId: payload.tenantId,
      email: payload.email,
      isSuperAdmin: payload.isSuperAdmin || false
    };
  } catch (error) {
    req.user = null;
  }

  next();
};

export default {
  authenticateToken,
  optionalAuth
};
