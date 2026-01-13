# 🚀 Render Web Service Configuration

## Создание Web Service в Render Dashboard

### 1. Создать новый Web Service
1. Зайти в https://dashboard.render.com
2. Нажать **New +** → **Web Service**
3. Подключить GitHub репозиторий `NIK117777/smetalab`

### 2. Настройки Web Service

**Basic Settings:**
- **Name**: `smetalab-backend`
- **Region**: `Frankfurt (EU Central)` ⚠️ ВАЖНО: тот же регион что и PostgreSQL!
- **Branch**: `master`
- **Root Directory**: `.` (корень проекта)
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm run start:server`

**Instance Type:**
- **Free** (для начала)

### 3. Environment Variables

Добавить в Render Dashboard → Environment:

```bash
# Database
DATABASE_URL=postgresql://smetalab_user:KJPh8y7plWvVIK2xiTeu9ROpUEk0QFSh@dpg-d51t19f6s9ss73eui8k0-a.frankfurt-postgres.render.com/smetalab_yay5

# JWT Secrets
JWT_ACCESS_SECRET=your_super_secret_access_key_change_this_in_production_12345
JWT_REFRESH_SECRET=your_super_secret_refresh_key_change_this_in_production_67890

# Environment
NODE_ENV=production
PORT=3001

# Email (если используется)
# RESEND_API_KEY=re_2S3ZNHhd_9mCwZfkcVAD9Fmpq61fekM42
```

### 4. Auto-Deploy
- ✅ Включить **Auto-Deploy** для ветки `master`

### 5. После деплоя

Render предоставит URL вида:
```
https://smetalab-backend.onrender.com
```

Этот URL нужно будет добавить в:
1. **Vercel** environment variables: `VITE_API_URL`
2. **CORS** настройки backend (если нужно)

## Health Check

После деплоя проверить:
- `https://smetalab-backend.onrender.com/api/health` - должен вернуть статус
- `https://smetalab-backend.onrender.com/api-docs` - Swagger документация

## Преимущества

✅ Backend и PostgreSQL в одном регионе (Frankfurt)
✅ Латенси < 1ms между backend и БД
✅ Автоматический деплой при push в master
✅ SSL из коробки
✅ Логи и мониторинг

## Следующий шаг

После создания Web Service:
1. Скопировать URL (например `https://smetalab-backend.onrender.com`)
2. Обновить в Vercel: `VITE_API_URL=https://smetalab-backend.onrender.com`
3. Redeploy фронтенда на Vercel
