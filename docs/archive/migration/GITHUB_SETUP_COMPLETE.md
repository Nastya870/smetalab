# ✅ GitHub Repository Setup Complete!

Репозиторий: https://github.com/Nastya870/smetalab

## Что запушено:

- ✅ Весь код проекта (1,282 файла)
- ✅ Миграции базы данных
- ✅ Скрипты миграции Neon → Render
- ✅ Документация (DEPLOY_TO_RENDER.md, MIGRATION_SUMMARY.md и др.)
- ✅ `render.yaml` для автодеплоя
- ✅ Обновленный `package.json` с командой `start:server`

## Следующий шаг: Создать Render Web Service

### Инструкция:

1. **Открыть Render Dashboard:**
   - Зайти на https://dashboard.render.com
   - Войти под аккаунтом с API ключом: `rnd_YR79NQeNAoPnxUsR0Kn8Qe0hCYnm`

2. **Создать Web Service через Blueprint (РЕКОМЕНДУЕТСЯ):**
   - Нажать **New +** → **Blueprint**
   - Connect GitHub account (если еще не подключен)
   - Выбрать репозиторий: **Nastya870/smetalab**
   - Render автоматически прочитает `render.yaml`
   - Нажать **Apply**
   
   Render создаст:
   - Web Service: `smetalab-backend`
   - Region: Frankfurt
   - Environment variables из `render.yaml`

3. **ИЛИ создать вручную:**
   - **New +** → **Web Service**
   - Connect Repository: **Nastya870/smetalab**
   - Настройки:
     - Name: `smetalab-backend`
     - Region: `Frankfurt (EU Central)`
     - Branch: `master`
     - Build Command: `npm install`
     - Start Command: `npm run start:server`
     - Instance Type: **Free**
   
   - Environment Variables (добавить вручную):
     ```
     DATABASE_URL=postgresql://smetalab_user:KJPh8y7plWvVIK2xiTeu9ROpUEk0QFSh@dpg-d51t19f6s9ss73eui8k0-a.frankfurt-postgres.render.com/smetalab_yay5
     JWT_ACCESS_SECRET=your_super_secret_access_key_change_this_in_production_12345
     JWT_REFRESH_SECRET=your_super_secret_refresh_key_change_this_in_production_67890
     NODE_ENV=production
     PORT=3001
     ```

4. **Дождаться деплоя:**
   - Render начнет автоматический deploy
   - Процесс займет ~5-10 минут
   - Следить за логами в Dashboard

5. **Получить URL:**
   - После успешного деплоя URL будет:
   - `https://smetalab-backend.onrender.com`
   
6. **Проверить:**
   - Открыть: `https://smetalab-backend.onrender.com/api/health`
   - Должен вернуть: `{"status":"ok"}`

---

**Готовы создавать Web Service? Скажите когда сделаете и я помогу с обновлением Vercel!**
