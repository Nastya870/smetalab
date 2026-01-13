# Критически важные миграции для CI/CD

Эта директория содержит **минимальный набор миграций**, необходимый для успешного запуска тестов в GitHub Actions.

## Порядок применения (обязательный):

1. **001_create_auth_tables.sql** — Базовые таблицы (tenants, users, roles, permissions)
2. **002_setup_rls.sql** — RLS функции (current_tenant_id, is_super_admin)
3. **003_create_works_table.sql** — Таблица работ
4. **004_create_materials_table.sql** — Таблица материалов
5. **007_create_projects_tables.sql** — Таблица проектов
6. **008_create_estimates_tables.sql** — Таблицы смет (estimates, estimate_items)
7. **060_fix_roles_permissions_constraints.sql** — Фикс ограничений ролей
8. **061_fix_roles_unique_constraint.sql** — Фикс уникальности ролей

## Архивированные миграции

Все остальные миграции перемещены в `database/migrations_archive/` для сохранения истории, но не применяются автоматически в CI.

## Для production деплоя

Если нужны дополнительные таблицы (purchases, contracts, schedules и т.д.), восстановите нужные файлы из архива.
