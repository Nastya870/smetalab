# Express API Server

Backend API для системы аутентификации и управления пользователями.

## 🚀 Быстрый старт

### Установка зависимостей
```bash
npm install
```

### Настройка переменных окружения
Убедитесь, что в `.env` файле есть:
```env
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=your_secret_key
JWT_REFRESH_SECRET=your_refresh_key
```

### Запуск миграций
```bash
npm run db:migrate
```

### Запуск сервера

**Development (с nodemon):**
```bash
npm run dev:server
```

**Production:**
```bash
npm run server
```

**Вместе с Vite:**
```bash
npm run dev
```

## 📁 Структура

```
server/
├── index.js                 # Главный файл Express сервера
├── config/
│   └── database.js         # Подключение к PostgreSQL
├── controllers/
│   └── authController.js   # Контроллеры аутентификации
├── middleware/
│   └── auth.js             # JWT middleware
├── routes/
│   └── auth.js             # Роуты аутентификации
└── utils/
    ├── jwt.js              # JWT утилиты
    └── password.js         # Password хеширование

database/
├── migrations/             # SQL миграции
│   ├── 001_create_auth_tables.sql
│   └── 003_setup_rls.sql
└── seeds/                  # Начальные данные
    └── 002_seed_roles_permissions.sql

scripts/
├── runMigrations.js        # Запуск миграций
└── clearDatabase.js        # Очистка БД
```

## 🔌 API Endpoints

### Аутентификация
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `POST /api/auth/logout` - Выход
- `POST /api/auth/refresh` - Обновление токена
- `GET /api/auth/me` - Информация о пользователе

### Служебные
- `GET /api/health` - Health check

Подробная документация: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

## 🔐 Безопасность

- **Пароли:** bcrypt с 10 salt rounds
- **Access Token:** JWT, 15 минут
- **Refresh Token:** UUID, 30 дней, хранится в БД
- **RLS:** Row Level Security для мультитенантности
- **Валидация:** Все входные данные валидируются
- **CORS:** Настроен для разрешённых доменов

## 🗄️ База данных

### Таблицы
- `tenants` - Компании
- `users` - Пользователи
- `user_tenants` - Связь пользователей с компаниями
- `roles` - Роли
- `permissions` - Разрешения
- `role_permissions` - Связь ролей и разрешений
- `user_role_assignments` - Назначение ролей пользователям
- `sessions` - Активные сессии (refresh tokens)
- `email_verifications` - Подтверждения email
- `password_resets` - Сброс паролей

### Роли по умолчанию
- `super_admin` - Суперадминистратор
- `admin` - Администратор компании
- `project_manager` - Менеджер проектов
- `estimator` - Сметчик
- `supplier` - Поставщик
- `viewer` - Наблюдатель

### Разрешения (39 штук)
- `users.*` - Управление пользователями
- `tenants.*` - Управление компаниями
- `projects.*` - Управление проектами
- `estimates.*` - Управление сметами
- И многие другие...

## 🧪 Тестирование

### PowerShell
```powershell
# Health check
(Invoke-WebRequest -Uri "http://localhost:3001/api/health").Content

# Регистрация
$body = @{
  companyName = "Test Company"
  email = "test@example.com"
  password = "Test123!@#"
  fullName = "Test User"
} | ConvertTo-Json

(Invoke-WebRequest -Uri "http://localhost:3001/api/auth/register" `
  -Method POST -Body $body -ContentType "application/json").Content
```

## 📦 Зависимости

### Production
- `express` - Web framework
- `pg` - PostgreSQL клиент
- `bcrypt` - Хеширование паролей
- `jsonwebtoken` - JWT токены
- `uuid` - Генерация UUID
- `cors` - CORS middleware
- `cookie-parser` - Cookie парсинг
- `dotenv` - Переменные окружения

### Development
- `nodemon` - Автоперезагрузка
- `concurrently` - Запуск нескольких команд

## 🔧 Конфигурация

### Порты
- **Express:** 3001
- **Vite:** 3000 (с проксированием /api/* → 3001)

### CORS
Разрешённые origins:
- http://localhost:5173 (Vite default)
- http://localhost:3000 (Custom Vite)

### Database Pool
- Max connections: 20
- Idle timeout: 30s
- Connection timeout: 2s

## 📝 Логирование

Сервер логирует:
- Все HTTP запросы с timestamp
- Database queries (в development)
- Ошибки с stack trace

## 🚨 Обработка ошибок

Централизованная обработка ошибок:
- Валидация входных данных
- Database ошибки
- JWT ошибки (expired, invalid)
- 404 для несуществующих роутов
- 500 для внутренних ошибок

## 📚 Дополнительно

- [Полная документация API](./API_DOCUMENTATION.md)
- [Database схема](../database/README.md)
- [ER диаграмма](../database/ER_DIAGRAM.md)
- [Критерии приёмки](../database/ACCEPTANCE_CRITERIA.md)
