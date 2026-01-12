// @vitest-environment node

/**
 * Unit тесты для server/middleware/checkPermission.js
 * Тестирует систему иерархических разрешений (КРИТИЧЕСКИЙ МОДУЛЬ!)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkPermission } from '../../../../server/middleware/checkPermission.js';

describe('checkPermission middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: null,
      method: 'GET',
      path: '/api/test',
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    next = vi.fn();

    // Подавляем логи
    vi.spyOn(console, 'log').mockImplementation(() => { });
    vi.spyOn(console, 'warn').mockImplementation(() => { });
    vi.spyOn(console, 'error').mockImplementation(() => { });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Тест 1: Super Admin - полный доступ
  // ============================================
  it('должен пропустить super admin без проверки разрешений', () => {
    req.user = {
      userId: 1,
      email: 'admin@smeta-lab.com',
      isSuperAdmin: true,
      permissions: [],
    };

    const middleware = checkPermission('users', 'delete');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  // ============================================
  // Тест 2: Прямое разрешение (точное совпадение)
  // ============================================
  it('должен пропустить если есть точное разрешение projects.read', () => {
    req.user = {
      userId: 2,
      email: 'manager@test.com',
      isSuperAdmin: false,
      permissions: [
        { key: 'projects.read', name: 'Просмотр проектов' },
        { key: 'projects.create', name: 'Создание проектов' },
      ],
    };

    const middleware = checkPermission('projects', 'read');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  // ============================================
  // Тест 3: Иерархия - admin.* → users.read
  // ============================================
  it('должен пропустить через иерархию: admin.read → users.read', () => {
    req.user = {
      userId: 3,
      email: 'admin@test.com',
      isSuperAdmin: false,
      permissions: [
        { key: 'admin.read', name: 'Просмотр администрирования' },
      ],
    };

    const middleware = checkPermission('users', 'read');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('✅ Permission granted via hierarchy')
    );
  });

  it('должен пропустить через иерархию: admin.create → users.create', () => {
    req.user = {
      userId: 3,
      permissions: [{ key: 'admin.create' }],
      isSuperAdmin: false,
    };

    const middleware = checkPermission('users', 'create');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('должен пропустить через иерархию: admin.update → roles.update', () => {
    req.user = {
      userId: 3,
      permissions: [{ key: 'admin.update' }],
      isSuperAdmin: false,
    };

    const middleware = checkPermission('roles', 'update');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('должен пропустить через иерархию: admin.delete → tenants.delete', () => {
    req.user = {
      userId: 3,
      permissions: [{ key: 'admin.delete' }],
      isSuperAdmin: false,
    };

    const middleware = checkPermission('tenants', 'delete');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  // ============================================
  // Тест 4: Иерархия - references.* → materials/works/counterparties
  // ============================================
  it('должен пропустить через иерархию: references.read → materials.read', () => {
    req.user = {
      userId: 4,
      permissions: [{ key: 'references.read' }],
      isSuperAdmin: false,
    };

    const middleware = checkPermission('materials', 'read');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('должен пропустить через иерархию: references.create → works.create', () => {
    req.user = {
      userId: 4,
      permissions: [{ key: 'references.create' }],
      isSuperAdmin: false,
    };

    const middleware = checkPermission('works', 'create');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('должен пропустить через иерархию: references.update → counterparties.update', () => {
    req.user = {
      userId: 4,
      permissions: [{ key: 'references.update' }],
      isSuperAdmin: false,
    };

    const middleware = checkPermission('counterparties', 'update');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('должен пропустить через иерархию: references.view_menu → materials.view_menu', () => {
    req.user = {
      userId: 4,
      permissions: [{ key: 'references.view_menu' }],
      isSuperAdmin: false,
    };

    const middleware = checkPermission('materials', 'view_menu');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  // ============================================
  // Тест 5: Иерархия - projects.* → estimates/purchases
  // ============================================
  it('должен пропустить через иерархию: projects.read → estimates.read', () => {
    req.user = {
      userId: 5,
      permissions: [{ key: 'projects.read' }],
      isSuperAdmin: false,
    };

    const middleware = checkPermission('estimates', 'read');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('должен пропустить через иерархию: projects.create → estimate_templates.create', () => {
    req.user = {
      userId: 5,
      permissions: [{ key: 'projects.create' }],
      isSuperAdmin: false,
    };

    const middleware = checkPermission('estimate_templates', 'create');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('должен пропустить через иерархию: projects.update → purchases.update', () => {
    req.user = {
      userId: 5,
      permissions: [{ key: 'projects.update' }],
      isSuperAdmin: false,
    };

    const middleware = checkPermission('purchases', 'update');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  // ============================================
  // Тест 6: Отказ в доступе (нет разрешений)
  // ============================================
  it('должен вернуть 403 если нет разрешения users.delete', () => {
    req.user = {
      userId: 6,
      email: 'manager@test.com',
      permissions: [{ key: 'projects.read' }],
      isSuperAdmin: false,
    };

    const middleware = checkPermission('users', 'delete');
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Недостаточно прав для выполнения действия',
      error: 'PERMISSION_DENIED',
      required: 'users.delete',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('должен вернуть 403 если есть read, но нужен delete', () => {
    req.user = {
      userId: 6,
      permissions: [{ key: 'projects.read' }],
      isSuperAdmin: false,
    };

    const middleware = checkPermission('projects', 'delete');
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('должен вернуть 403 если есть parent.read, но нужен child.delete', () => {
    req.user = {
      userId: 6,
      permissions: [{ key: 'admin.read' }],
      isSuperAdmin: false,
    };

    // admin.read даёт только users.read, но НЕ users.delete
    const middleware = checkPermission('users', 'delete');
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        required: 'users.delete',
      })
    );
  });

  // ============================================
  // Тест 7: Нет пользователя
  // ============================================
  it('должен вернуть 403 если req.user не определён', () => {
    req.user = null;

    const middleware = checkPermission('projects', 'read');
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('должен вернуть 403 если permissions пустой массив', () => {
    req.user = {
      userId: 7,
      permissions: [],
      isSuperAdmin: false,
    };

    const middleware = checkPermission('projects', 'read');
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  // ============================================
  // Тест 8: Логирование
  // ============================================
  it('должен логировать успешное прямое разрешение', () => {
    req.user = {
      userId: 8,
      permissions: [{ key: 'projects.read' }],
      isSuperAdmin: false,
    };

    const middleware = checkPermission('projects', 'read');
    middleware(req, res, next);

    expect(console.log).toHaveBeenCalledWith(
      '✅ Permission granted: projects.read for user 8'
    );
  });

  it('должен логировать отказ в доступе', () => {
    req.user = {
      userId: 9,
      permissions: [],
      isSuperAdmin: false,
    };

    const middleware = checkPermission('users', 'delete');
    middleware(req, res, next);

    expect(console.warn).toHaveBeenCalledWith(
      '⛔ Permission denied: users.delete for user 9'
    );
  });

  // ============================================
  // Тест 9: Wildcard разрешения (admin.*)
  // ============================================
  it('должен работать с wildcard admin.* как с прямым разрешением', () => {
    req.user = {
      userId: 10,
      permissions: [{ key: 'admin.*' }],
      isSuperAdmin: false,
    };

    // admin.* это разрешение на все действия с admin
    const middleware = checkPermission('admin', '*');
    middleware(req, res, next);

    // Middleware найдёт точное совпадение admin.* и пропустит
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  // ============================================
  // Тест 10: Множественные разрешения
  // ============================================
  it('должен работать с несколькими разрешениями', () => {
    req.user = {
      userId: 11,
      permissions: [
        { key: 'projects.read' },
        { key: 'projects.create' },
        { key: 'projects.update' },
        { key: 'estimates.read' },
      ],
      isSuperAdmin: false,
    };

    // Проверяем каждое разрешение
    const middlewares = [
      checkPermission('projects', 'read'),
      checkPermission('projects', 'create'),
      checkPermission('projects', 'update'),
      checkPermission('estimates', 'read'),
    ];

    middlewares.forEach(mw => {
      mw(req, res, next);
      expect(next).toHaveBeenCalled();
      next.mockClear();
    });
  });

  // ============================================
  // Тест 11: Регресс-тест бага super_admin (21.11.2025)
  // ============================================
  it('REGRESSION TEST: super_admin с несколькими ролями должен иметь полный доступ', () => {
    // Воспроизводим сценарий бага:
    // Пользователь имеет роли [super_admin, admin] в JWT
    // Старый код проверял только первую роль

    req.user = {
      userId: 1,
      email: 'kiy026@yandex.ru',
      roles: ['super_admin', 'admin'], // Несколько ролей
      isSuperAdmin: true, // ⭐ Должно быть установлено правильно
      permissions: [
        { key: 'admin.create' },
        { key: 'admin.read' },
        // ... другие права
      ],
    };

    // Super admin должен пройти ЛЮБУЮ проверку
    const criticalChecks = [
      checkPermission('users', 'delete'),
      checkPermission('roles', 'delete'),
      checkPermission('tenants', 'create'),
      checkPermission('estimates', 'delete'),
    ];

    criticalChecks.forEach(mw => {
      mw(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      next.mockClear();
    });
  });
});
