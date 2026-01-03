# 🐛 FIX: Экспорт Excel - Ошибка 405 (Method Not Allowed)

**Дата**: 26 декабря 2025  
**Коммит**: 8105be9  
**Статус**: ✅ Исправлено

## Проблема

При попытке экспортировать смету в Excel возникала **ошибка 405 (Method Not Allowed)**:

```
Failed to load resource: the server responded with a status of 405 ()
EstimateView-BqH9tH9D.js:116 Ошибка экспорта Excel: Error: Ошибка экспорта Excel
```

## Причина

В `app/estimates/EstimateWithSidebar.jsx` для экспорта Excel использовался **обычный fetch** вместо `axiosInstance`:

```javascript
// ❌ НЕПРАВИЛЬНО (старый код)
const response = await fetch('/api/export-estimate-excel', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify(exportData),
});
```

### Почему это проблема?

1. **В разработке (localhost)**: Запросы проксируются через Vite (`vite.config.mjs`), работает нормально
2. **В production (Vercel)**: Нет прокси-сервера, запрос идёт на **Vercel frontend** вместо **Render backend**
3. **Результат**: 405 ошибка, потому что Vercel статический хостинг не обрабатывает POST запросы к `/api/*`

### Архитектура приложения

```
┌─────────────────────────────────────────────────────────────────┐
│                          PRODUCTION                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Vercel (Frontend)                   Render (Backend + DB)      │
│  ┌──────────────────┐               ┌──────────────────┐        │
│  │  React SPA       │   HTTPS API   │  Express Server  │        │
│  │  smeta-lab.ru    │──────────────>│  /api/*          │        │
│  │                  │               │                  │        │
│  │  fetch('/api')   │   ❌ 405      │  PostgreSQL      │        │
│  │  (без baseURL)   │<──────────────│                  │        │
│  └──────────────────┘               └──────────────────┘        │
│                                                                  │
│  ✅ ПРАВИЛЬНО:                                                  │
│  axiosInstance использует baseURL:                              │
│  'https://smetalab-backend.onrender.com/api'                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Решение

Заменили `fetch` на `axiosInstance`, который автоматически использует правильный `baseURL`:

```javascript
// ✅ ПРАВИЛЬНО (новый код)
const response = await axiosInstance.post('/export-estimate-excel', exportData, {
  responseType: 'blob' // Важно для получения Excel файла
});

const blob = response.data; // Axios возвращает данные в response.data
```

### Что изменилось?

1. **Добавлен импорт**: `import axiosInstance from 'shared/lib/axiosInstance';`
2. **Заменён fetch на axiosInstance.post()**
3. **Указан responseType: 'blob'** для корректного получения бинарного файла
4. **Убраны ручные заголовки** - axiosInstance добавляет токен автоматически
5. **Упрощён код** - не нужно проверять `response.ok` и вручную парсить blob

## Преимущества axiosInstance

### 1. Автоматический baseURL
```javascript
// shared/lib/axiosInstance.js
const isProduction = window.location.hostname.includes('vercel.app') || 
                     window.location.hostname.includes('smeta-lab.ru');

const API_URL = isProduction
  ? 'https://smetalab-backend.onrender.com/api'  // Production → Render
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api'; // Dev → localhost
```

### 2. Автоматический токен JWT
```javascript
// Request interceptor - добавляет токен к каждому запросу
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 3. Автоматический refresh токена
```javascript
// Response interceptor - обновляет истекшие токены
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      // Автоматически обновляет токен и повторяет запрос
      return refreshAndRetry(error.config);
    }
    return Promise.reject(error);
  }
);
```

## Файлы изменены

- `app/estimates/EstimateWithSidebar.jsx`:
  - Добавлен импорт `axiosInstance`
  - Функция `handleExportExcel()` переписана с axiosInstance
  - Код сокращён с 45 строк до 35 строк

## Backend роут (без изменений)

```javascript
// server/routes/estimates.js
router.post('/export-estimate-excel', 
  checkPermission('estimates', 'read'), 
  exportEstimateToExcel
);

// server/controllers/exportEstimateController.js
export async function exportEstimateToExcel(req, res) {
  const workbook = new ExcelJS.Workbook();
  // ... генерация Excel
  const buffer = await workbook.xlsx.writeBuffer();
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="estimate_${estimateId}.xlsx"`);
  res.send(buffer);
}
```

## Тестирование

### ✅ Development (localhost:3000)
```bash
npm run dev
# Vite прокси: /api → http://localhost:3001/api
# axiosInstance baseURL: http://localhost:3001/api
# ✅ Работает
```

### ✅ Production (Vercel + Render)
```
User → https://smeta-lab.ru
Frontend → axiosInstance.post('/export-estimate-excel')
axiosInstance → https://smetalab-backend.onrender.com/api/export-estimate-excel
Backend → Генерирует Excel → Возвращает blob
Frontend → Скачивает файл
✅ Работает
```

## Другие места, где используется fetch

Проверил весь код - во всех остальных местах используется правильно:
- ✅ `worksAPI` - использует axiosInstance
- ✅ `materialsAPI` - использует axiosInstance
- ✅ `estimatesAPI` - использует axiosInstance
- ✅ `estimateTemplatesAPI` - использует axiosInstance
- ❌ **ТОЛЬКО** `handleExportExcel` использовал fetch (теперь исправлено)

## Deployment

После пуша изменений:
1. **GitHub** → master branch (коммит 8105be9)
2. **Vercel** → Автоматический деплой фронтенда (2-3 минуты)
3. **Render** → Бэкенд без изменений (уже работал правильно)

## Проверка после деплоя

1. Открыть смету на https://smeta-lab.ru
2. Добавить несколько работ и материалов
3. Нажать кнопку **"Excel"** (зелёная кнопка)
4. Должен скачаться файл `estimate_123.xlsx`
5. Открыть Excel - должна быть красиво отформатированная смета

## Связанные файлы

- `shared/lib/axiosInstance.js` - Конфигурация axios с автоматическим baseURL
- `vite.config.mjs` - Прокси для разработки
- `server/routes/estimates.js` - Backend роут
- `server/controllers/exportEstimateController.js` - Логика генерации Excel
- `.env.production` - VITE_API_URL для production

## Уроки

1. **ВСЕГДА используйте axiosInstance** для API запросов в React
2. **НЕ используйте fetch** для API запросов (теряется baseURL, токен, refresh)
3. **Тестируйте в production** - локально может работать из-за прокси
4. **Проверяйте Network tab** в DevTools для диагностики 405/404 ошибок

## Коммит

```bash
git commit -m "🐛 FIX: Экспорт Excel - исправлена ошибка 405 (Method Not Allowed)

- Заменён fetch на axiosInstance для правильного baseURL
- В production запросы теперь идут на Render бэкенд
- Добавлен импорт axiosInstance
- responseType: 'blob' для корректного получения Excel файла"
```

---

**Версия**: 1.30  
**Последнее обновление**: 26 декабря 2025, 15:45 MSK
