Инструкция по интеграционному тестированию (сессия 21-22 ноября 2025)

Цель: воспроизвести шаги, которые мы делали вчера — отладить и запускать integration tests локально, сохранить примечания и команды.

1) Короткое резюме изменений, которые были сделаны, и почему

- Изоляция тестовых данных
  - Роли-тесты используют специальный email domain `@rolestest.local` для избежания удаления и конфликтов с общими cleanup-скриптами.
  - Это обеспечивает, что cleanupTestData (для `@test.com`) не удаляет данные roles-тестов.

- Улучшенный cleanup
  - `tests/fixtures/testDatabase.js` — cleanupTestData теперь удаляет только tenants, которые принадлежат исключительно `@test.com` пользователям (по tenant_id), чтобы не задеть другие tenants.

- Transactional createTestUser
  - `createTestUser` использует единый client и транзакцию для создания user + tenant + default roles — предотвращает FK ошибки.

- Middleware
  - `server/middleware/adminAuth.js` — requireAdmin больше не требует tenantId для super_admin (userId обязателен), чтобы супер-админ мог работать глобально.

- Тесты
  - `tests/integration/api/roles.api.test.js` — обновлены email, ожидания и URL для получения разрешений роли (`/api/permissions/roles/:id`).

2) Файлы, которые я создал/изменил (важное для ревью)

- tests/fixtures/testDatabase.js — модифицирован cleanupTestData и createTestUser (транзакция)
- server/middleware/adminAuth.js — убрана проверка tenantId для requireAdmin
- tests/integration/api/roles.api.test.js — изоляция email domain, исправлены assertions, URL и ожидания структуры

3) Как запустить integration tests локально (PowerShell)

Откройте PowerShell и выполните из папки `vite` (проще всего воспользоваться скриптом):

# Запустить из каталога project/vite/test-scripts
.
```powershell
# из каталога vite/test-scripts
.\run-integration.ps1
```

Или вручную:
```powershell
# Перейти в корень vite
Set-Location 'c:\Users\Admin\Desktop\smeta-v1.21\smeta-v1.21\smeta-v1.20\smeta-v1.20\smeta-v1.20\vite'
# Запустить интеграционные тесты
npm run test:integration
```

4) Как запустить локальные сервера (PowerShell)

Скрипт `run-servers.ps1` запустит backend и frontend в отдельных процессах:

```powershell
# из папки vite/test-scripts
.\run-servers.ps1
```

Вручную (если нужно увидеть логи в текущем окне):
```powershell
Set-Location 'c:\Users\Admin\Desktop\smeta-v1.21\smeta-v1.21\smeta-v1.20\smeta-v1.20\smeta-v1.20\vite'
# backend
npm run server
# frontend (в другом окне)
npm run dev
```

5) Быстрая проверка (smoke checks)

- После запуска серверов
  - http://localhost:3001/api/health — ожидаемый ответ состояния
  - http://localhost:3001/api/auth/* — auth endpoints доступны

- После запуска тестов
  - Ожидаемый итог: 26/26 passing (см. лог сессии)

6) Примечания по отладке и советы

- Если видите ошибки NO_TENANTS или FK constraint для sessions — проверьте, не запущены ли другие тесты/cleanups параллельно (использовать `@rolestest.local` для ролей).
- Для воспроизведения проблем запуска тестов по-одному используйте Vitest `--run tests/integration/api/roles.api.test.js`.

7) Контакты/следующие шаги

См. `TODO.md` в этой папке для плана дальнейших действий: CI, E2E с Playwright, performance, покрытие unit.
