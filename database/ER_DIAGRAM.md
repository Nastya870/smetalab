# 📊 ER-Диаграмма базы данных

```
┌─────────────────────────┐
│       TENANTS           │
│─────────────────────────│
│ PK  id (UUID)           │
│     name (TEXT) UNIQUE  │
│     plan (TEXT)         │
│     status (TEXT)       │
│     created_at          │
│     updated_at          │
└─────────────────────────┘
           │
           │ 1:N
           ▼
┌─────────────────────────┐          ┌─────────────────────────┐
│    USER_TENANTS         │          │        USERS            │
│─────────────────────────│          │─────────────────────────│
│ PK  id (UUID)           │          │ PK  id (UUID)           │
│ FK  tenant_id ────────┐ │◄────┐    │     email (CITEXT) UQ   │
│ FK  user_id           │ │     └────┤     phone (TEXT) UQ     │
│     is_default (BOOL) │ │          │     pass_hash (TEXT)    │
│     joined_at         │ │          │     full_name (TEXT)    │
└─────────────────────────┘          │     status (TEXT)       │
                                     │     email_verified      │
                                     │     created_at          │
                                     └─────────────────────────┘
                                                │
                                                │ 1:N
                    ┌───────────────────────────┼───────────────────────────┐
                    │                           │                           │
                    ▼                           ▼                           ▼
        ┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────────────┐
        │      SESSIONS          │  │ EMAIL_VERIFICATIONS    │  │   PASSWORD_RESETS      │
        │────────────────────────│  │────────────────────────│  │────────────────────────│
        │ PK  id (UUID)          │  │ PK  id (UUID)          │  │ PK  id (UUID)          │
        │ FK  user_id            │  │ FK  user_id            │  │ FK  user_id            │
        │ FK  tenant_id          │  │     email (CITEXT)     │  │     email (CITEXT)     │
        │     refresh_token UQ   │  │     token (TEXT) UQ    │  │     token (TEXT) UQ    │
        │     expires_at         │  │     expires_at         │  │     expires_at         │
        │     device_info        │  │     verified_at        │  │     used_at            │
        └────────────────────────┘  └────────────────────────┘  └────────────────────────┘


┌─────────────────────────┐          ┌─────────────────────────┐
│        ROLES            │          │     PERMISSIONS         │
│─────────────────────────│          │─────────────────────────│
│ PK  id (UUID)           │          │ PK  id (UUID)           │
│     key (TEXT) UNIQUE   │          │     key (TEXT) UNIQUE   │
│     name (TEXT)         │          │     name (TEXT)         │
│     description (TEXT)  │          │     resource (TEXT)     │
│     is_system (BOOL)    │          │     action (TEXT)       │
└─────────────────────────┘          └─────────────────────────┘
           │                                     │
           │                                     │
           │         ┌───────────────────────────┘
           │         │
           ▼         ▼
┌─────────────────────────┐
│   ROLE_PERMISSIONS      │
│─────────────────────────│
│ PK  id (UUID)           │
│ FK  role_id             │
│ FK  permission_id       │
│ UQ  (role_id, perm_id)  │
└─────────────────────────┘
           │
           │
           ▼
┌─────────────────────────────────────┐
│   USER_ROLE_ASSIGNMENTS             │
│─────────────────────────────────────│
│ PK  id (UUID)                       │
│ FK  tenant_id ──┐                   │
│ FK  user_id ────┼────────┐          │
│ FK  role_id     │        │          │
│ FK  assigned_by │        │          │
│ UQ  (tenant_id, │        │          │
│      user_id,   │        │          │
│      role_id)   │        │          │
└─────────────────┼────────┼──────────┘
                  │        │
           ┌──────┘        └──────┐
           ▼                      ▼
      [TENANTS]              [USERS]
```

## Легенда

- **PK** - Primary Key (Первичный ключ)
- **FK** - Foreign Key (Внешний ключ)
- **UQ** - Unique Constraint (Уникальное ограничение)
- **1:N** - One-to-Many (Один ко многим)
- **M:N** - Many-to-Many (Многие ко многим)

## Основные связи

### 1. Мульти-тенантность
```
TENANTS 1───N USER_TENANTS N───1 USERS
```
Пользователь может быть членом нескольких компаний, компания может иметь множество пользователей.

### 2. Система ролей и разрешений (RBAC)
```
ROLES 1───N ROLE_PERMISSIONS N───1 PERMISSIONS
ROLES 1───N USER_ROLE_ASSIGNMENTS N───1 USERS
```
Роли связаны с разрешениями через `role_permissions`. Пользователи получают роли в рамках тенанта через `user_role_assignments`.

### 3. Аутентификация
```
USERS 1───N SESSIONS
USERS 1───N EMAIL_VERIFICATIONS
USERS 1───N PASSWORD_RESETS
```
Каждый пользователь может иметь множество сессий (мульти-устройства), токенов подтверждения email и восстановления пароля.

## Ключевые особенности

### ✅ Безопасность
- Все ID используют UUID
- Пароли хранятся только в виде хэша
- Email использует тип CITEXT (case-insensitive)
- Уникальные ограничения на email и phone
- Row Level Security (RLS) для изоляции данных тенантов

### ✅ Производительность
- Индексы на всех внешних ключах
- Составные индексы для частых запросов
- Индексы на поля expires_at для быстрой очистки устаревших записей

### ✅ Гибкость
- Мульти-тенантность "из коробки"
- RBAC система с гранулярными разрешениями
- Поддержка мульти-устройств для сессий
- Опциональный телефон для 2FA

### ✅ Аудит
- created_at на всех таблицах
- updated_at с автоматическим триггером
- assigned_by для отслеживания кто назначил роль
- last_login_at для пользователей

## Типичные запросы

### Получить все разрешения пользователя
```sql
SELECT DISTINCT p.key, p.name, p.resource, p.action
FROM user_role_assignments ura
JOIN roles r ON r.id = ura.role_id
JOIN role_permissions rp ON rp.role_id = r.id
JOIN permissions p ON p.id = rp.permission_id
WHERE ura.user_id = $user_id
  AND ura.tenant_id = $tenant_id;
```

### Получить всех пользователей компании
```sql
SELECT u.*, r.name as role_name
FROM users u
JOIN user_tenants ut ON u.id = ut.user_id
JOIN user_role_assignments ura ON u.id = ura.user_id 
  AND ut.tenant_id = ura.tenant_id
JOIN roles r ON r.id = ura.role_id
WHERE ut.tenant_id = $tenant_id
  AND u.status = 'active';
```

### Проверить наличие разрешения
```sql
SELECT EXISTS (
  SELECT 1
  FROM user_role_assignments ura
  JOIN role_permissions rp ON rp.role_id = ura.role_id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE ura.user_id = $user_id
    AND ura.tenant_id = $tenant_id
    AND p.key = 'estimates.create'
) as has_permission;
```
