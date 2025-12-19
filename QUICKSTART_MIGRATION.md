# 🚀 Быстрый старт: Миграция БД

## ✅ Что уже готово:

1. **Render PostgreSQL создан** ✅  
   URL: `dpg-d4soiv4cjiac739o2is0-a.frankfurt-postgres.render.com`

2. **Скрипты миграции созданы** ✅
   - `scripts/backup-neon-to-file.mjs` - бэкап в файл
   - `scripts/migrate-neon-to-render.mjs` - копирование данных
   - `scripts/verify-migration.mjs` - проверка миграции

3. **Конфигурации готовы** ✅
   - `railway.json` / `railway.toml` - для Railway (опционально)
   - `.env.railway` - шаблон переменных
   - `MIGRATION_PLAN.md` - полный план

---

## 🎬 Как запустить миграцию (3 простых шага):

### **Шаг 1: Бэкап текущей БД (5 минут)**
```bash
npm run db:backup
```
Создаст файл: `backups/neon-backup-2025-12-18.sql`

---

### **Шаг 2: Применить миграции на Render DB (2 минуты)**
```bash
# Временно переключиться на Render DB
$env:DATABASE_URL = $env:RENDER_DATABASE_URL

# Применить все миграции
npm run db:migrate

# Вернуть обратно на Neon
$env:DATABASE_URL = $env:DATABASE_URL_NEON
```

---

### **Шаг 3: Копировать данные Neon → Render (10-15 минут)**
```bash
npm run db:migrate:neon-to-render
```

Скрипт автоматически:
- ✅ Подключится к обеим БД
- ✅ Скопирует все таблицы
- ✅ Синхронизирует sequences
- ✅ Покажет статистику

---

### **Шаг 4: Проверить результат (2 минуты)**
```bash
npm run db:verify:migration
```

Должны увидеть:
```
✅ ВЕРИФИКАЦИЯ УСПЕШНА! Данные полностью совпадают.
✅ Можно безопасно переключать DATABASE_URL на Render
```

---

## 🔄 Переключение Production

### **Вариант 1: Render (РЕКОМЕНДУЮ)**

#### 1. Создать Web Service на Render
1. Зайти на https://render.com
2. **New → Web Service**
3. Connect GitHub: `NIK117777/smetalab`
4. Name: `smetalab-api`
5. Branch: `master`
6. Runtime: `Node`
7. Build Command: `npm install`
8. Start Command: `node server/index.js`
9. Region: **Frankfurt**

#### 2. Настроить переменные окружения
```bash
DATABASE_URL = [подключить Render PostgreSQL]
JWT_ACCESS_SECRET = [скопировать из .env]
JWT_REFRESH_SECRET = [скопировать из .env]
RESEND_API_KEY = [скопировать из .env]
SENDER_EMAIL = noreply@smeta-lab.ru
SENDER_NAME = Smeta Lab
FRONTEND_URL = https://smeta-lab.ru
NODE_ENV = production
```

#### 3. Обновить Vercel
```bash
# Vercel Dashboard → Settings → Environment Variables
VITE_API_URL = https://smetalab-api.onrender.com
```

#### 4. Деплой!
```bash
# Render автоматически задеплоит при push в master
git push origin master
```

---

### **Вариант 2: Railway (альтернатива)**

#### 1. Установить Railway CLI
```bash
npm install -g @railway/cli
railway login
```

#### 2. Создать проект
```bash
railway init
railway link
```

#### 3. Добавить PostgreSQL
```bash
railway add postgresql
```

#### 4. Деплой
```bash
railway up
```

Railway автоматически:
- ✅ Определит Node.js проект
- ✅ Прочитает `railway.json`
- ✅ Подключит PostgreSQL
- ✅ Задеплоит backend

---

## 🎯 Что нужно от вас:

### Для Render (проще):
1. Создать аккаунт на https://render.com
2. Подключить GitHub repo
3. Скопировать переменные окружения из `.env`
4. Нажать "Create Web Service"

### Для Railway (опционально):
1. Создать аккаунт на https://railway.app
2. Запустить `railway login`
3. Запустить `railway init`
4. Готово!

---

## 📊 Чеклист миграции:

- [ ] Создать Render/Railway аккаунт
- [ ] Запустить `npm run db:backup`
- [ ] Применить миграции на новой БД
- [ ] Запустить `npm run db:migrate:neon-to-render`
- [ ] Проверить `npm run db:verify:migration`
- [ ] Создать Web Service на Render
- [ ] Настроить переменные окружения
- [ ] Обновить `VITE_API_URL` на Vercel
- [ ] Задеплоить backend
- [ ] Мониторить логи первые 30 минут

---

## 🚨 Rollback (если нужно):

```bash
# 1. Vercel: вернуть старый API URL
VITE_API_URL = https://old-backend-url

# 2. Render: переключить DATABASE_URL обратно на Neon
DATABASE_URL = [Neon connection string]

# 3. Redeploy
git revert HEAD
git push origin master
```

---

## 📞 Нужна помощь?

Если что-то пойдет не так:
1. Проверьте логи: Render Dashboard → Logs
2. Проверьте БД: `npm run db:verify:migration`
3. Rollback: используйте план выше

---

**Готовы начать? Выберите платформу (Render или Railway) и сообщите!** 🚀
