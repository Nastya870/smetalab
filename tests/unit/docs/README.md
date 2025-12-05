# 🧪 Unit Tests

**Статус:** ✅ 67/67 passing (100%)

---

## 📋 Что тестируется?

### 1. Auth Utilities (`tests/unit/auth.test.js`)
- ✅ Генерация JWT токенов (access + refresh)
- ✅ Проверка токенов (валидных и невалидных)
- ✅ Извлечение payload из токенов
- ✅ Обработка истёкших токенов
- ✅ Обработка поврежденных токенов

### 2. Password Utilities (`tests/unit/password.test.js`)
- ✅ Хеширование паролей (bcrypt)
- ✅ Сравнение паролей
- ✅ Валидация силы пароля (минимум 8 символов)

### 3. Permissions Middleware (`tests/unit/checkPermission.test.js`)
- ✅ Проверка базовых разрешений
- ✅ Wildcard разрешения (`admin.*`)
- ✅ Иерархические разрешения (`admin.read` → `materials.read`)
- ✅ Отказ в доступе без разрешений

---

## 🚀 Запуск

### Из корня проекта
```powershell
npm run test:unit
```

### Через скрипт
```powershell
.\test-scripts\unit-tests\scripts\run-unit-tests.ps1
```

### Запуск отдельного файла
```powershell
npx vitest run tests/unit/auth.test.js
npx vitest run tests/unit/password.test.js
npx vitest run tests/unit/checkPermission.test.js
```

### С coverage
```powershell
npm run test:coverage -- tests/unit/
```

---

## 📊 Coverage

| Файл | Statements | Branches | Functions | Lines |
|------|-----------|----------|-----------|-------|
| `server/utils/jwt.js` | 100% | 100% | 100% | 100% |
| `server/utils/password.js` | 100% | 100% | 100% | 100% |
| `server/middleware/checkPermission.js` | 46% | 50% | 50% | 46% |

**Цель:** Увеличить coverage checkPermission.js до 80%+

---

## 🎯 План развития

1. ✅ Базовые unit тесты (auth, password, permissions)
2. ⏳ Увеличить coverage checkPermission.js (46% → 80%)
3. ⏳ Добавить тесты для контроллеров (works, materials, projects)
4. ⏳ Добавить тесты для middleware (adminAuth.js, requireAuth.js)
5. ⏳ Добавить тесты для моделей (если есть бизнес-логика)

---

## 📖 См. также

- **[TESTING_GUIDE.md](../../TESTING_GUIDE.md)** — главное руководство
- **[TODO.md](../../TODO.md)** — полный план развития
- **[shared/fixtures/](../../shared/fixtures/)** — тестовые данные
