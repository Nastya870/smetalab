# Очистка старых ссылок на Neon PostgreSQL

## ⚠️ Статус: Миграция на Render PostgreSQL завершена

С декабря 2025 года проект использует **Render PostgreSQL (Frankfurt)** вместо Neon.

---

## ✅ Критические файлы (уже исправлены)

- `scripts/runMigrations.js` — убран fallback на Neon, требуется DATABASE_URL
- `README.md` — обновлено описание БД
- `server/config/database.js` — использует только DATABASE_URL

---

## 📋 Файлы со старыми ссылками (некритично, можно оставить)

### Архивные скрипты миграций (в `database/migrations/`)
Эти файлы использовались для разовых миграций и больше не запускаются:
- `run011.js`, `run012.js`, `run-013.js`, `run-014.js`, `run-015.js`
- `check-*.js` (check-materials, check-projects, check-links и т.д.)
- `create-default-project.js`, `seed-work-materials.js`, `test-query.js`

**Действие**: Можно переместить в `database/migrations_archive/` или оставить как есть.

### Утилиты (в `utils-scripts/`)
- `apply-migration-043.mjs`, `apply-migration-059.mjs`
- `check-materials-count.mjs`

**Действие**: Эти скрипты больше не используются, можно удалить или архивировать.

### Сиды (в `database/seeds/`)
- `seed_works.js` — содержит hardcoded Neon URL
- `seed_materials.js` — упоминание в логах

**Действие**: Обновить на `process.env.DATABASE_URL` если планируется использовать.

### Бэкап скрипты (в `scripts/`)
- `backup-neon-to-file.mjs` — специфичный для Neon

**Действие**: Переименовать в `backup-db-to-file.mjs` и обновить логи.

### Документация (в `docs/archive/`)
- `README.md`, `migration/MIGRATION_SUMMARY.md`

**Действие**: Оставить как есть — это исторические документы о миграции.

---

## 🔧 Рекомендуемые действия

### 1. Архивировать старые скрипты миграций
```bash
# PowerShell
Move-Item "database/migrations/run*.js" "database/migrations_archive/"
Move-Item "database/migrations/check-*.js" "database/migrations_archive/"
Move-Item "database/migrations/create-*.js" "database/migrations_archive/"
Move-Item "database/migrations/seed-*.js" "database/migrations_archive/"
Move-Item "database/migrations/test-*.js" "database/migrations_archive/"
```

### 2. Обновить сиды (если используются)
```javascript
// database/seeds/seed_materials.js
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL не установлен!');
  process.exit(1);
}
```

### 3. Переименовать backup скрипт
```bash
# PowerShell
Rename-Item "scripts/backup-neon-to-file.mjs" "scripts/backup-db-to-file.mjs"
```

---

## ✅ Текущее состояние

- **Production БД**: Render PostgreSQL (Frankfurt)
- **DATABASE_URL**: Установлен в Render Environment Variables
- **Миграции**: Работают через `npm run db:migrate` с обязательным DATABASE_URL
- **Бэкапы**: Автоматические через Render (ежедневно)

---

## 📝 Примечания

- Все hardcoded Neon URLs в архивных скриптах **не влияют** на production
- Основной скрипт миграций (`scripts/runMigrations.js`) **требует** DATABASE_URL
- Документация в `docs/archive/` сохранена для истории миграции
