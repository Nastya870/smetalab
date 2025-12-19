# Smeta Pro

**Многопользовательская SaaS-система для управления строительными сметами**

## 🚀 Быстрый старт

### Требования
- Node.js 18+ (рекомендуется 20+)
- PostgreSQL 14+
- npm или yarn

### Установка

```bash
# Клонировать репозиторий
git clone https://github.com/Nastya870/smetalab.git
cd smetalab

# Установить зависимости
npm install

# Настроить переменные окружения
cp .env.example .env
# Отредактировать .env - добавить DATABASE_URL и секреты JWT

# Запустить миграции
npm run db:migrate

# Запустить в режиме разработки
npm run dev
```

Приложение откроется на `http://localhost:3000`

## 📦 Деплой

### Production окружение

**Frontend**: Vercel  
**Backend**: Render Web Service  
**Database**: Render PostgreSQL (Frankfurt)

### Переменные окружения

**Backend (.env на Render):**
```
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
NODE_ENV=production
PORT=3001
```

**Frontend (Vercel Environment Variables):**
```
VITE_API_URL=https://smetalab-backend.onrender.com
```

## 🏗️ Архитектура

- **Frontend**: React 19, Material-UI 7, Vite 6, React Router 7
- **Backend**: Express 5, PostgreSQL, JWT Authentication
- **Multi-tenancy**: Изоляция данных на уровне tenant_id
- **RBAC**: Ролевая система доступа с permissions

### Структура проекта

```
app/              # React приложение (страницы, компоненты)
server/           # Express backend
  ├── controllers/  # Обработчики запросов
  ├── repositories/ # Слой доступа к данным
  ├── services/     # Бизнес-логика
  ├── middleware/   # Auth, permissions, rate limiting
  └── routes/       # API endpoints
shared/lib/       # Общий код (контексты, утилиты)
database/         # Миграции, схемы, документация
tests/            # Unit, Integration, E2E тесты
scripts/          # Утилиты для работы с БД
```

## 🧪 Тестирование

```bash
# Все тесты
npm test

# Unit тесты
npm run test:unit

# Integration тесты
npm run test:integration

# E2E тесты (Playwright)
npm run test:e2e

# Coverage отчёт
npm run test:coverage
```

## 🔐 Безопасность

- JWT аутентификация (access + refresh tokens)
- RBAC с детальными permissions
- Multi-tenant изоляция данных
- Rate limiting на API
- CORS настроен для production доменов
- SQL injection защита через параметризованные запросы

## 📚 Документация

- [Database Schema](database/README.md)
- [API Documentation](http://localhost:3001/api-docs) - Swagger UI
- [Testing Strategy](tests/README.md)
- [Copilot Instructions](.github/copilot-instructions.md)

## 🛠️ Управление базой данных

```bash
# Список пользователей с ролями
npm run db:users

# Назначить super_admin роль
npm run db:set-admin user@example.com

# Запустить миграции вручную
node scripts/runMigrations.js
```

## 📝 Лицензия

Proprietary - Все права защищены

## 👥 Команда

Разработка: Smeta Pro Team  
GitHub: [@Nastya870](https://github.com/Nastya870)

---

**Версия**: 1.28  
**Последнее обновление**: Декабрь 2025
