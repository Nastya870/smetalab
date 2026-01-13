План дальнейших действий (короткий):

1) CI/CD (рекомендуется сразу)
   - Создать GitHub Actions workflow: lint → unit tests → integration tests → coverage.
   - Настроить job с базой (Postgres) и кешем зависимостей.
   - Вынести секреты в GitHub Secrets.

2) E2E тесты (Playwright)
   - Написать 5 критических сценариев (регистрация→вход, создание проекта, добавить материал, генерировать смету, управление ролями).
   - Настроить локально и в CI-runner (headless).

3) Performance smoke (k6)
   - Базовый тест для auth и estimate generation.

4) Увеличить unit-coverage
   - checkPermission.js и остальные middleware.

5) Рефакторинг тестовой инфраструктуры
   - Подумать о выделенной тестовой БД/схеме в CI для окончательной изоляции.

Приоритет сейчас: 1 → 2 → 4 → 3 → 5
