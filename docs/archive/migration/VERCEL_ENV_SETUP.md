# Vercel Environment Variables Setup

## Обязательные переменные для Production

Перейдите в Vercel Dashboard → Settings → Environment Variables

Добавьте следующие переменные:

### API Configuration (КРИТИЧНО!)
```
VITE_API_URL=https://smetalab-backend.onrender.com
```
**Важно:** Переменные с префиксом `VITE_` встраиваются в код при сборке!

### App Settings
```
VITE_APP_VERSION=v1.0.0
VITE_APP_BASE_NAME=/
VITE_APP_NAME=Сметное приложение
GENERATE_SOURCEMAP=false
```

### Email Settings (Resend)
```
RESEND_API_KEY=re_2S3ZNHhd_9mCwZfkcVAD9Fmpq61fekM42
SENDER_EMAIL=noreply@smeta-lab.ru
SENDER_NAME=Smeta Lab
FRONTEND_URL=https://smeta-lab.ru
```

## Для всех переменных выберите:
- ✅ Production
- ✅ Preview  
- ✅ Development

## После добавления:
1. Сохраните все переменные
2. Redeploy проект (Deployments → ... → Redeploy)
3. **ВАЖНО:** Отключите "Use existing Build Cache"

## Проверка:
После деплоя откройте DevTools → Network и проверьте URL запросов:
- ✅ Правильно: `https://smetalab-backend.onrender.com/api/auth/login`
- ❌ Неправильно: `/api/auth/login` (относительный путь)
