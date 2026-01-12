// @vitest-environment node

/**
 * Unit тесты для server/middleware/auth.js
 * Тестирует аутентификацию через JWT токены
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authenticateToken, optionalAuth } from '../../../../server/middleware/auth.js';
import * as jwtUtils from '../../../../server/utils/jwt.js';

// Мокируем jwt utils
vi.mock('../../../../server/utils/jwt.js', () => ({
  verifyAccessToken: vi.fn(),
}));

describe('authenticateToken middleware', () => {
  let req, res, next;

  beforeEach(() => {
    // Создаём моки для request, response, next
    req = {
      headers: {},
      method: 'GET',
      path: '/api/test',
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    next = vi.fn();

    // Очищаем console.log для чистых тестов
    vi.spyOn(console, 'log').mockImplementation(() => { });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Тест 1: Нет токена
  // ============================================
  it('должен вернуть 401 если нет Authorization header', () => {
    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Токен не предоставлен',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('должен вернуть 401 если Authorization header пустой', () => {
    req.headers.authorization = 'Bearer ';

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('должен вернуть 401 если Authorization header без Bearer', () => {
    req.headers.authorization = 'some-token';

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  // ============================================
  // Тест 2: Невалидный токен
  // ============================================
  it('должен вернуть 403 если токен невалидный', () => {
    req.headers.authorization = 'Bearer invalid-token';
    jwtUtils.verifyAccessToken.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Недействительный токен',
      error: 'Invalid token',
    });
    expect(next).not.toHaveBeenCalled();
  });

  // ============================================
  // Тест 3: Истёкший токен
  // ============================================
  it('должен вернуть 401 с кодом TOKEN_EXPIRED если токен истёк', () => {
    req.headers.authorization = 'Bearer expired-token';
    jwtUtils.verifyAccessToken.mockImplementation(() => {
      const error = new Error('TOKEN_EXPIRED');
      error.message = 'TOKEN_EXPIRED';
      throw error;
    });

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Токен истёк',
      code: 'TOKEN_EXPIRED',
    });
    expect(next).not.toHaveBeenCalled();
  });

  // ============================================
  // Тест 4: Валидный токен - успешная аутентификация
  // ============================================
  it('должен добавить user в req и вызвать next() для валидного токена', () => {
    const mockPayload = {
      userId: 1,
      tenantId: 'tenant-123',
      email: 'test@test.com',
      isSuperAdmin: false,
      permissions: ['projects.read', 'projects.create'],
    };

    req.headers.authorization = 'Bearer valid-token';
    jwtUtils.verifyAccessToken.mockReturnValue(mockPayload);

    authenticateToken(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual(mockPayload);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  // ============================================
  // Тест 5: Super Admin токен
  // ============================================
  it('должен корректно обработать super admin токен', () => {
    const mockPayload = {
      userId: 1,
      tenantId: null,
      email: 'admin@smeta-lab.com',
      isSuperAdmin: true,
      permissions: ['admin.*', 'references.*', 'projects.*'],
    };

    req.headers.authorization = 'Bearer super-admin-token';
    jwtUtils.verifyAccessToken.mockReturnValue(mockPayload);

    authenticateToken(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.isSuperAdmin).toBe(true);
    expect(req.user.permissions).toContain('admin.*');
  });

  // ============================================
  // Тест 6: Токен без permissions (старый формат)
  // ============================================
  it('должен установить пустой массив permissions если их нет в токене', () => {
    const mockPayload = {
      userId: 1,
      tenantId: 'tenant-123',
      email: 'test@test.com',
      // permissions отсутствуют
    };

    req.headers.authorization = 'Bearer old-format-token';
    jwtUtils.verifyAccessToken.mockReturnValue(mockPayload);

    authenticateToken(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.permissions).toEqual([]);
  });

  // ============================================
  // Тест 7: Логирование
  // ============================================
  it('должен логировать успешную аутентификацию', () => {
    const mockPayload = {
      userId: 1,
      email: 'test@test.com',
      permissions: [],
    };

    req.headers.authorization = 'Bearer valid-token';
    jwtUtils.verifyAccessToken.mockReturnValue(mockPayload);

    authenticateToken(req, res, next);

    expect(console.log).toHaveBeenCalledWith(
      '✅ Auth: User authenticated',
      'GET',
      '/api/test',
      'test@test.com'
    );
  });

  it('должен логировать отсутствие токена', () => {
    authenticateToken(req, res, next);

    expect(console.log).toHaveBeenCalledWith(
      '❌ Auth: No token provided for',
      'GET',
      '/api/test'
    );
  });
});

// ============================================
// Тесты для optionalAuth middleware
// ============================================
describe('optionalAuth middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      method: 'GET',
      path: '/api/public',
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    next = vi.fn();

    vi.spyOn(console, 'log').mockImplementation(() => { });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Тест 1: Нет токена - продолжаем без user
  // ============================================
  it('должен установить req.user = null и вызвать next() если нет токена', () => {
    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeNull();
    expect(res.status).not.toHaveBeenCalled();
  });

  // ============================================
  // Тест 2: Валидный токен - добавляем user
  // ============================================
  it('должен добавить user в req для валидного токена', () => {
    const mockPayload = {
      userId: 1,
      tenantId: 'tenant-123',
      email: 'test@test.com',
      isSuperAdmin: false,
    };

    req.headers.authorization = 'Bearer valid-token';
    jwtUtils.verifyAccessToken.mockReturnValue(mockPayload);

    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual(mockPayload);
    expect(res.status).not.toHaveBeenCalled();
  });

  // ============================================
  // Тест 3: Невалидный токен - продолжаем без user
  // ============================================
  it('должен установить req.user = null если токен невалидный', () => {
    req.headers.authorization = 'Bearer invalid-token';
    jwtUtils.verifyAccessToken.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeNull();
    expect(res.status).not.toHaveBeenCalled();
  });

  // ============================================
  // Тест 4: Истёкший токен - продолжаем без user
  // ============================================
  it('должен установить req.user = null если токен истёк', () => {
    req.headers.authorization = 'Bearer expired-token';
    jwtUtils.verifyAccessToken.mockImplementation(() => {
      throw new Error('TOKEN_EXPIRED');
    });

    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeNull();
    expect(res.status).not.toHaveBeenCalled();
  });
});
