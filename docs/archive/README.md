# Архив документации

Эта папка содержит исторические документы и временные инструкции.

## Структура

### migration/
Документация процесса миграции с Neon PostgreSQL на Render (декабрь 2025):
- `MIGRATION_PLAN.md` - План миграции
- `MIGRATION_SUMMARY.md` - Итоги миграции (127,382 записей, 34 таблицы)
- `DEPLOY_TO_RENDER.md` - Инструкции по деплою на Render
- `RENDER_WEB_SERVICE_SETUP.md` - Настройка Web Service
- `GITHUB_SETUP_COMPLETE.md` - Настройка GitHub репозитория
- `VERCEL_ENV_SETUP.md` - Настройка Vercel окружения
- `E2E_TEST_REPORT.md` - Отчёт E2E тестирования

### old-env/
Старые конфигурационные файлы:
- `.env.railway` - Railway.app конфигурация (не используется)

## История миграции

**Дата**: 18-19 декабря 2025  
**Исходная база**: Neon PostgreSQL  
**Целевая база**: Render PostgreSQL (Frankfurt)  
**Данных мигрировано**: 127,382 записей  
**Таблиц**: 34  
**Статус**: ✅ Успешно

**Новая архитектура**:
- Frontend: Vercel
- Backend: Render Web Service
- Database: Render PostgreSQL

**Старая архитектура** (до миграции):
- Frontend + Serverless API: Vercel
- Database: Neon PostgreSQL
