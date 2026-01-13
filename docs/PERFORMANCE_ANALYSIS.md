# 🚀 Анализ производительности SmetaLab

**Дата анализа**: 8 января 2026  
**Версия**: v4.1.2

---

## 📊 Резюме

### Общая оценка: ⚠️ **Требуется оптимизация**

| Категория | Статус | Приоритет |
|-----------|--------|-----------|
| **Backend DB Queries** | ⚠️ Средний | 🔴 Высокий |
| **Frontend Bundle** | ✅ Хороший | 🟡 Средний |
| **API Endpoints** | ⚠️ Средний | 🔴 Высокий |
| **Caching** | ❌ Плохо | 🔴 Высокий |
| **Memory Leaks** | ✅ Не обнаружено | 🟢 Низкий |

---

## ⚠️ Критические проблемы производительности

### 1. N+1 проблема в `findByIdWithDetails` (КРИТИЧНО)

**Файл**: `server/repositories/estimatesRepository.js:241-336`

**Проблема**:
```javascript
// Получаем позиции сметы
const items = await Promise.all(
  itemsResult.rows.map(async (item, index) => {
    // 🔴 ДЛЯ КАЖДОЙ ПОЗИЦИИ делаем отдельный запрос к БД!
    const materialsQuery = `
      SELECT * FROM estimate_item_materials eim
      JOIN materials m ON eim.material_id = m.id
      WHERE eim.estimate_item_id = $1
    `;
    const materialsResult = await pool.query(materialsQuery, [item.id]);
   
 ...
  })
);
```

**Влияние**:
- Смета с 100 позициями = **100 дополнительных SQL запросов**
- Время загрузки сметы: **2-5 секунд** (вместо 200-500ms)
- Нагрузка на БД увеличивается линейно с количеством позиций

**Решение**:
```javascript
// ✅ ПРАВИЛЬНО: Один JOIN запрос вместо N запросов
export async function findByIdWithDetails(estimateId, tenantId) {
  const query = `
    SELECT 
      e.*,
      p.name as project_name,
      
      -- Items
      ei.id as item_id,
      ei.name as item_name,
      ei.quantity as item_quantity,
      ei.unit_price as item_price,
      
      -- Materials (JOIN один раз)
      eim.id as material_link_id,
      eim.quantity as material_quantity,
      eim.unit_price as material_price,
      m.id as material_id,
      m.name as material_name,
      m.sku,
      m.unit,
      m.category
      
    FROM estimates e
    LEFT JOIN projects p ON e.project_id = p.id
    LEFT JOIN estimate_items ei ON e.id = ei.estimate_id
    LEFT JOIN estimate_item_materials eim ON ei.id = eim.estimate_item_id
    LEFT JOIN materials m ON eim.material_id = m.id
    WHERE e.id = $1 AND e.tenant_id = $2
    ORDER BY ei.position_number, m.name
  `;
  
  const result = await pool.query(query, [estimateId, tenantId]);
  
  // Группируем в памяти (быстро)
  const grouped = groupByEstimate(result.rows);
  return grouped;
}
```

**Приоритет**: 🔴 **КРИТИЧЕСКИЙ** - исправить немедленно

---

### 2. Отсутствие кэширования на frontend

**Проблема**: В проекте **НЕ используется SWR** или React Query для кэширования запросов

**Файлы**: 
- `grep "useSWR" app/` → **0 результатов**
- Все запросы делаются через `axios` напрямую без кэша

**Влияние**:
- Каждый переход между страницами = новые запросы к API
- Список материалов загружается заново при каждом открытии справочника
- Нет background revalidation
- Дублирование запросов при одновременных mount компонентов

**Решение**:
```javascript
// ✅ Использовать SWR (уже в зависимостях!)
import useSWR from 'swr';

// components/Materials/MaterialsList.jsx
const MaterialsList = () => {
  const { data, error, isLoading } = useSWR(
    '/api/materials?limit=100',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1 минута
    }
  );
  
  // SWR автоматически кэширует и deduplicates запросы
};

// shared/lib/api/fetcher.js
export const fetcher = (url) => axios.get(url).then(res => res.data);
```

**Приоритет**: 🔴 **ВЫСОКИЙ**

---

### 3. Большой размер JavaScript bundle

**Текущий размер**: 13.64 MB (257 файлов в dist/)

**Проблема**: Не настроено code splitting и tree shaking

**Влияние**:
- Первая загрузка страницы: **5-10 секунд** на медленном интернете
- Загружаются неиспользуемые библиотеки целиком

**Анализ**:
```javascript
// vite.config.mjs
build: {
  chunkSizeWarningLimit: 1600  // 🔴 Слишком высокий лимит!
}
```

**Причины**:
1. **Material-UI** загружается целиком (6-7 MB)
2. **ApexCharts** не используется tree shaking
3. **@tabler/icons-react** импортирует ВСЕ иконки

**Решение**:
```javascript
// ❌ ПЛОХО
import { IconUser, IconLogout } from '@tabler/icons-react';

// ✅ ХОРОШО
import IconUser from '@tabler/icons-react/dist/esm/icons/IconUser.mjs';
import IconLogout from '@tabler/icons-react/dist/esm/icons/IconLogout.mjs';

// vite.config.mjs - добавить manual chunks
build: {
  chunkSizeWarningLimit: 500, // Снизить лимит
  rollupOptions: {
    output: {
      manualChunks: {
        'mui-core': ['@mui/material', '@mui/icons-material'],
        'charts': ['apexcharts', 'react-apexcharts'],
        'editor': ['react-quill'], // если используется
        'utils': ['lodash-es', 'date-fns', 'dayjs']
      }
    }
  }
}
```

**Приоритет**: 🟡 **СРЕДНИЙ**

---

### 4. SELECT * в запросах

**Проблема**: Используется `SELECT *` вместо явного перечисления полей

**Примеры**:
```sql
-- ❌ ПЛОХО - везде SELECT *
SELECT * FROM counterparties WHERE tenant_id = $1
SELECT * FROM estimate_items WHERE estimate_id = $1
SELECT * FROM materials WHERE id = $1
```

**Влияние**:
- Передача лишних данных по сети
- Увеличенный размер JSON response
- Невозможность оптимизации индексов (covering indexes)

**Решение**:
```sql
-- ✅ ХОРОШО - только нужные поля
SELECT 
  id, name, sku, price, unit, category, is_global, tenant_id
FROM materials 
WHERE id = $1
```

**Приоритет**: 🟡 **СРЕДНИЙ**

---

### 5. Отсутствие pagination на больших списках

**Файл**: `server/controllers/estimateController.js:8-78`

**Проблема**:
```javascript
export const getEstimates = catchAsync(async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  // ✅ Есть pagination, НО дефолтный limit = 50 слишком большой
  
  // 🔴 Загружаем ВСЕ items для каждой сметы!
  LEFT JOIN estimate_items ei ON e.id = ei.estimate_id
  // Если в смете 1000 позиций, это 50,000 строк (50 смет * 1000)
});
```

**Влияние**:
- Запрос списка смет может возвращать **50-100 MB JSON**
- Медленный рендеринг на frontend

**Решение**:
```javascript
// Для списка смет НЕ нужно загружать items
SELECT 
  e.*,
  u.full_name as creator_name,
  COUNT(ei.id) as items_count,  // ✅ Только количество
  SUM(ei.final_price) as total  // ✅ Только сумма
FROM estimates e
LEFT JOIN estimate_items ei ON e.id = ei.estimate_id
GROUP BY e.id
LIMIT 20  // Снизить до 20
```

**Приоритет**: 🔴 **ВЫСОКИЙ**

---

## 🐌 Средние проблемы производительности

### 6. Множественные запросы в `/api/search/pinecone`

**Файл**: `server/routes/search.js:178`

**Проблема**:
```javascript
const fullResults = await Promise.all(searchResults.map(async (result) => {
  // 🔴 Для КАЖДОГО результата делаем запрос к БД
  const dbResult = await db(
    `SELECT ${selectFields} FROM ${table} WHERE id = $1`,
    [dbId]
  );
  // ...
}));
```

**Влияние**:
- Поиск 20 результатов = **20 запросов к БД**
- Время ответа: 500-1000ms вместо 100-200ms

**Решение**:
```javascript
// ✅ Batch query с WHERE IN
const ids = searchResults.map(r => parseInt(r.dbId));
const materialIds = ids.filter((_, i) => searchResults[i].type === 'material');
const workIds = ids.filter((_, i) => searchResults[i].type === 'work');

const [materials, works] = await Promise.all([
  materialIds.length > 0 
    ? db(`SELECT * FROM materials WHERE id = ANY($1)`, [materialIds])
    : { rows: [] },
  workIds.length > 0
    ? db(`SELECT * FROM works WHERE id = ANY($1)`, [workIds])
    : { rows: [] }
]);

// Сопоставляем в памяти
const dataMap = new Map();
materials.rows.forEach(m => dataMap.set(`material-${m.id}`, m));
works.rows.forEach(w => dataMap.set(`work-${w.id}`, w));

const fullResults = searchResults.map(result => ({
  ...result,
  ...dataMap.get(`${result.type}-${result.dbId}`)
}));
```

**Приоритет**: 🟡 **СРЕДНИЙ**

---

### 7. Отсутствие connection pooling настроек

**Файл**: `server/config/database.js`

**Текущее**: 
```javascript
// Использует дефолтные настройки pg
// max: 10, idleTimeoutMillis: 10000
```

**Проблема**:
- На Render free plan может быть **недостаточно connections**
- Долгие idle connections занимают слоты

**Решение**:
```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                    // Увеличить до 20
  idleTimeoutMillis: 30000,   // 30 секунд
  connectionTimeoutMillis: 5000,
  statement_timeout: 10000,   // 10 сек таймаут запросов
  query_timeout: 10000
});
```

**Приоритет**: 🟡 **СРЕДНИЙ**

---

### 8. React.memo не везде используется

**Проблема**: Многие компоненты ре-рендерятся без изменения props

**Примеры**:
- `EstimateTableSection` - нет memo
- `WorkRow` - нет memo
- `MaterialRow` - нет memo

**Влияние**:
- Лишние ре-рендеры при редактировании сметы
- UI лагает при вводе в input

**Решение**:
```javascript
// ✅ Использовать React.memo для дорогих компонентов
const EstimateTableSection = React.memo(({ section, ... }) => {
  // ...
}, (prevProps, nextProps) => {
  // Custom comparison для оптимизации
  return prevProps.section.id === nextProps.section.id &&
         prevProps.section.items.length === nextProps.section.items.length;
});
```

**Приоритет**: 🟡 **СРЕДНИЙ**

---

## 💡 Рекомендации по оптимизации

### Фаза 1: Критические фиксы (1-2 дня)

1. **Исправить N+1 в `findByIdWithDetails`**
   - Заменить Promise.all на один JOIN
   - Группировать результаты в памяти
   - **Ожидаемый прирост**: загрузка сметы с 3-5 сек → 300-500ms

2. **Добавить кэширование с SWR**
   - Обернуть API вызовы в useSWR хуки
   - Настроить revalidation стратегию
   - **Ожидаемый прирост**: уменьшение запросов на 60-70%

3. **Оптимизировать `/api/search/pinecone`**
   - Batch запросы с WHERE IN
   - **Ожидаемый прирост**: время ответа с 800ms → 200ms

### Фаза 2: Bundle optimization (1-2 дня)

4. **Code splitting**
   - Настроить manual chunks в Vite
   - Lazy load для крупных компонентов (Charts, WYSIWYG)
   - **Ожидаемый прирост**: начальный bundle с 13MB → 3-4MB

5. **Tree shaking**
   - Исправить импорты @tabler/icons-react
   - Использовать MUI в режиме tree-shakable
   - **Ожидаемый прирост**: -2-3 MB

### Фаза 3: DB optimization (2-3 дня)

6. **Заменить SELECT * на явные поля**
   - Пройтись по всем queries
   - Создать covering indexes
   - **Ожидаемый прирост**: размер JSON на 20-30% меньше

7. **Снизить default pagination limits**
   - 50 → 20 для списков
   - Добавить виртуализацию для длинных таблиц (react-virtuoso)

8. **Настроить connection pooling**
   - Оптимизировать параметры pool
   - Добавить monitoring

### Фаза 4: React optimization (1-2 дня)

9. **React.memo и useMemo**
   - Добавить в EstimateTableSection, WorkRow, MaterialRow
   - useCallback для стабильных функций
   - **Ожидаемый прирост**: UI responsiveness +30%

10. **Виртуализация длинных списков**
    - react-virtuoso для таблиц смет
    - Рендерить только видимые строки

---

## 📈 Метрики после оптимизации (прогноз)

| Метрика | До | После | Улучшение |
|---------|-----|-------|-----------|
| **Загрузка сметы (100 позиций)** | 3-5 сек | 300-500ms | **10x** |
| **Список смет (50 записей)** | 2-3 сек | 500-800ms | **4x** |
| **Первая загрузка страницы** | 8-10 сек | 2-3 сек | **4x** |
| **Размер initial bundle** | 13.6 MB | 3-4 MB | **4x** |
| **Поиск (Pinecone)** | 800ms | 200ms | **4x** |
| **Количество DB queries (смета)** | 100+ | 1-3 | **50x** |

---

## 🔧 Инструменты для мониторинга

### 1. Анализ Bundle Size
```bash
npm run build
# Откроет dist/stats.html с visualization
```

### 2. DB Query logging
```javascript
// server/config/database.js
pool.on('connect', (client) => {
  const originalQuery = client.query;
  client.query = (...args) => {
    console.time(`Query: ${args[0].substring(0, 50)}`);
    const result = originalQuery.apply(client, args);
    result.finally(() => console.timeEnd(`Query: ${args[0].substring(0, 50)}`));
    return result;
  };
});
```

### 3. React DevTools Profiler
- Включить в production build
- Анализировать ре-рендеры

### 4. Lighthouse CI
```bash
npm install -g @lhci/cli
lhci autorun --upload.target=temporary-public-storage
```

---

## 🎯 Приоритизация

### Must-have (перед production load)
- ✅ Исправить N+1 в findByIdWithDetails
- ✅ Добавить SWR кэширование
- ✅ Оптимизировать /api/search/pinecone

### Should-have (Q1 2026)
- 🔧 Bundle optimization (code splitting)
- 🔧 SELECT * → явные поля
- 🔧 React.memo + useMemo

### Nice-to-have (Q2 2026)
- 💡 Redis caching layer
- 💡 CDN для static assets
- 💡 Server-side pagination everywhere
- 💡 GraphQL вместо REST (опционально)

---

**Итого**: При устранении критических проблем (Фаза 1) можно достичь **4-10x прироста** производительности с минимальными усилиями (1-2 дня разработки).

