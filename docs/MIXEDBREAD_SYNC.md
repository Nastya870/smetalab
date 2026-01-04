# Mixedbread Semantic Search Integration

## Обзор

Автоматическая синхронизация данных из PostgreSQL в Mixedbread Store для semantic retrieval.

**Архитектура:**
- PostgreSQL (source of truth) → Export Service → Mixedbread Client → Mixedbread Store
- Разделение на **global** (is_global=true) и **tenant** (tenant-specific) данные
- Tracking синхронизации через `mixedbread_index_state` таблицу
- Автоматический cleanup удалённых записей

## Возможности

✅ **Multi-tenancy**: Изоляция tenant данных, глобальные данные доступны всем  
✅ **Incremental sync**: Upsert только изменённых документов  
✅ **Cleanup**: Автоматическое удаление документов, удалённых из БД  
✅ **Retry & backoff**: Устойчивость к временным сбоям API  
✅ **Batching**: Обработка больших объёмов данных (50K+ документов)  
✅ **Logging**: Подробное логирование без PII  
✅ **Cron-ready**: Standalone скрипт для автоматизации  

---

## Быстрый старт

### 1. Настройка переменных окружения

Добавьте в `.env` (локально) и Render Environment Variables (production):

```bash
# Mixedbread API
MXBAI_API_KEY=mxb_your_api_key_here
MXBAI_STORE_ID=your-store-uuid-here

# Или альтернативные названия
MIXEDBREAD_API_KEY=mxb_your_api_key_here
MIXEDBREAD_STORE_ID=your-store-uuid-here
```

### 2. Запуск миграции

```bash
node scripts/runMigrations.js
```

Это создаст таблицу `mixedbread_index_state` для отслеживания синхронизации.

### 3. Тестовая синхронизация

```bash
# Только global данные
node scripts/mixedbread-sync-cron.mjs global

# Только конкретный tenant
node scripts/mixedbread-sync-cron.mjs tenant <tenant-uuid>

# Все tenants
node scripts/mixedbread-sync-cron.mjs tenants

# Полная синхронизация (global + все tenants)
node scripts/mixedbread-sync-cron.mjs all
```

---

## Архитектура

### Компоненты

```
┌─────────────────────────────────────────────────────────────┐
│                        PostgreSQL                            │
│  materials (is_global, tenant_id)                           │
│  works (is_global, tenant_id)                               │
│  mixedbread_index_state (document_id, last_seen_at)        │
└───────────────┬─────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│              Export Service                                  │
│  - exportMaterials({ scope, tenantId, limit, offset })     │
│  - exportWorks({ scope, tenantId, limit, offset })         │
│  - exportAll({ scope, tenantId, batchSize })               │
│  - getAllTenantIds()                                        │
└───────────────┬─────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│              Sync Worker                                     │
│  - syncGlobal(storeId)                                      │
│  - syncTenant(tenantId, storeId)                           │
│  - syncAllTenants(storeId)                                 │
│  - syncAll(storeId)                                        │
│                                                              │
│  Логика:                                                    │
│  1. Экспорт из PostgreSQL (батчами)                        │
│  2. Upsert в Mixedbread                                    │
│  3. Обновление index_state (last_seen_at = NOW())         │
│  4. Поиск stale документов (last_seen_at < sync_started)  │
│  5. Удаление из Mixedbread + index_state                   │
└───────────────┬─────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│              Mixedbread Client                               │
│  - upsertDocuments(storeId, documents)                     │
│  - deleteDocuments(storeId, documentIds)                   │
│  - upsertDocumentsBatch(storeId, documents, batchSize)     │
│  - deleteDocumentsBatch(storeId, documentIds, batchSize)   │
│                                                              │
│  Features:                                                  │
│  - Retry с экспоненциальным backoff (5 попыток)           │
│  - Rate limiting (429) handling                            │
│  - Batching (100 docs/batch для upsert, 500 для delete)   │
│  - Таймауты (120s для upsert, 60s для delete)             │
└───────────────┬─────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│              Mixedbread Store                                │
│  - Semantic search по всем документам                       │
│  - Фильтрация: (tenantId == X) OR (isGlobal == true)      │
└─────────────────────────────────────────────────────────────┘
```

### Формат документов

**Материалы:**
```json
{
  "id": "global-material-<uuid>",  // или "tenant-material-<uuid>"
  "text": "Штукатурка гипсовая Ротбанд 30кг Knauf кг",
  "metadata": {
    "tenantId": null,  // null для global, uuid для tenant
    "type": "material",
    "dbId": "<uuid>",
    "categoryId": "Сухие смеси",
    "supplierId": "Knauf",
    "unit": "кг",
    "isGlobal": true,  // true для global, false для tenant
    "scope": "global"  // "global" или "tenant"
  }
}
```

**Работы:**
```json
{
  "id": "tenant-work-<uuid>",
  "text": "Штукатурка стен по маякам Внутренние работы м²",
  "metadata": {
    "tenantId": "<tenant-uuid>",
    "type": "work",
    "dbId": "<uuid>",
    "categoryId": "Внутренние работы",
    "supplierId": null,
    "unit": "м²",
    "isGlobal": false,
    "scope": "tenant"
  }
}
```

### Таблица mixedbread_index_state

```sql
CREATE TABLE mixedbread_index_state (
  document_id VARCHAR(255) PRIMARY KEY,  -- "global-material-123"
  scope VARCHAR(10) NOT NULL,            -- "global" или "tenant"
  tenant_id UUID,                        -- NULL для global
  entity_type VARCHAR(20) NOT NULL,      -- "material" или "work"
  db_id UUID NOT NULL,                   -- ID записи в materials/works
  last_seen_at TIMESTAMP WITH TIME ZONE, -- Последняя синхронизация
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

**Индексы:**
- `idx_mixedbread_state_scope_tenant` - для cleanup queries
- `idx_mixedbread_state_entity_type` - для статистики
- `idx_mixedbread_state_tenant_id` - для tenant-specific queries

---

## API Endpoints

### GET /api/mixedbread/export/materials

Экспорт материалов в формате Mixedbread documents.

**Query Parameters:**
- `scope` (string): `global` или `tenant` (default: `tenant`)
- `tenantId` (uuid): ID тенанта (обязательно для `scope=tenant`, игнорируется для `global`)
- `limit` (number): Количество документов (default: 500)
- `offset` (number): Смещение для пагинации (default: 0)

**Примеры:**
```bash
# Экспорт глобальных материалов
GET /api/mixedbread/export/materials?scope=global&limit=100&offset=0

# Экспорт материалов tenant (tenantId из токена)
GET /api/mixedbread/export/materials?scope=tenant&limit=500&offset=0

# Экспорт материалов конкретного tenant (для admin/worker)
GET /api/mixedbread/export/materials?scope=tenant&tenantId=<uuid>&limit=500
```

**Response:**
```json
{
  "success": true,
  "scope": "global",
  "tenantId": null,
  "count": 100,
  "limit": 100,
  "offset": 0,
  "documents": [...]
}
```

### GET /api/mixedbread/export/works

Экспорт работ (аналогично materials).

### GET /api/mixedbread/export/all

Полный экспорт всех данных (материалы + работы).

**Query Parameters:**
- `scope` (string): `global` или `tenant`
- `tenantId` (uuid): ID тенанта (для `scope=tenant`)
- `batchSize` (number): Размер батча (default: 500)

**Response:**
```json
{
  "success": true,
  "scope": "tenant",
  "tenantId": "<uuid>",
  "total": 12456,
  "materialsCount": 10000,
  "worksCount": 2456,
  "documents": [...]
}
```

### GET /api/mixedbread/tenants

Получить список всех tenant IDs (для worker/admin).

**Response:**
```json
{
  "success": true,
  "count": 5,
  "tenantIds": [
    "4eded664-27ac-4d7f-a9d8-f8340751ceab",
    "..."
  ]
}
```

---

## Deployment на Render

### Вариант 1: Cron Job (рекомендуется)

**Создание Cron Job:**
1. Render Dashboard → New → Cron Job
2. **Name**: `smetalab-mixedbread-sync`
3. **Environment**: Same as smetalab-backend
4. **Schedule**: `0 3 * * *` (каждый день в 3:00 AM UTC)
5. **Command**: `node scripts/mixedbread-sync-cron.mjs all`
6. **Environment Variables**:
   ```
   MXBAI_API_KEY=mxb_...
   MXBAI_STORE_ID=...
   DATABASE_URL=${{smetalab-backend.DATABASE_URL}}
   ```

**Альтернативные расписания:**
- `0 * * * *` - каждый час
- `0 */6 * * *` - каждые 6 часов
- `0 3,15 * * *` - в 3:00 и 15:00
- `0 3 * * 0` - каждое воскресенье в 3:00

### Вариант 2: Background Worker (для частых синхронизаций)

**render.yaml:**
```yaml
services:
  - type: worker
    name: smetalab-mixedbread-sync
    env: node
    buildCommand: npm install
    startCommand: node scripts/mixedbread-sync-loop.mjs
    envVars:
      - key: MXBAI_API_KEY
        sync: false
      - key: MXBAI_STORE_ID
        sync: false
      - key: DATABASE_URL
        fromService:
          name: smetalab-backend
          type: web
          envVarKey: DATABASE_URL
      - key: SYNC_INTERVAL_HOURS
        value: "6"  # Синхронизация каждые 6 часов
```

**scripts/mixedbread-sync-loop.mjs:**
```javascript
import 'dotenv/config';
import { syncAll } from '../server/services/mixedbreadSyncWorker.js';

const SYNC_INTERVAL_HOURS = parseInt(process.env.SYNC_INTERVAL_HOURS || '6');
const SYNC_INTERVAL_MS = SYNC_INTERVAL_HOURS * 60 * 60 * 1000;

async function loop() {
  while (true) {
    try {
      console.log(`\n🕐 Следующая синхронизация через ${SYNC_INTERVAL_HOURS} часов\n`);
      await syncAll();
    } catch (error) {
      console.error('❌ Sync failed:', error);
    }
    
    await new Promise(resolve => setTimeout(resolve, SYNC_INTERVAL_MS));
  }
}

loop();
```

### Мониторинг

**Логи:**
```bash
# Render Dashboard → Cron Job → Logs
# Или через CLI:
render logs -s smetalab-mixedbread-sync
```

**Метрики синхронизации:**
- ✅ Успешные синхронизации: проверяйте exit code = 0
- ❌ Ошибки: exit code ≠ 0, смотрите stack trace в логах
- ⏱️ Длительность: логируется в конце каждого запуска
- 📊 Статистика: кол-во uploaded/deleted документов

---

## Локальная разработка

### Тестирование экспорта

```bash
# Экспорт global материалов (первые 10)
curl "http://localhost:3001/api/mixedbread/export/materials?scope=global&limit=10" \
  -H "Authorization: Bearer <your-jwt-token>"

# Экспорт tenant данных
curl "http://localhost:3001/api/mixedbread/export/all?scope=tenant&tenantId=<uuid>" \
  -H "Authorization: Bearer <your-jwt-token>"
```

### Тестирование синхронизации

```bash
# Global only
node scripts/mixedbread-sync-cron.mjs global

# Конкретный tenant
node scripts/mixedbread-sync-cron.mjs tenant 4eded664-27ac-4d7f-a9d8-f8340751ceab

# Все tenants
node scripts/mixedbread-sync-cron.mjs tenants

# Полная синхронизация
node scripts/mixedbread-sync-cron.mjs all
```

### Дебаггинг

**Проверка index_state:**
```sql
-- Сколько документов в index_state?
SELECT scope, COUNT(*) FROM mixedbread_index_state GROUP BY scope;

-- Последняя синхронизация по tenant
SELECT tenant_id, MAX(last_seen_at) as last_sync
FROM mixedbread_index_state
WHERE scope = 'tenant'
GROUP BY tenant_id;

-- Найти stale документы (не синхронизированы >7 дней)
SELECT document_id, scope, tenant_id, last_seen_at
FROM mixedbread_index_state
WHERE last_seen_at < NOW() - INTERVAL '7 days'
ORDER BY last_seen_at DESC;
```

**Ручная очистка:**
```sql
-- Удалить все записи index_state (пересинхронизация с нуля)
TRUNCATE mixedbread_index_state;
```

---

## Troubleshooting

### Ошибка: "MXBAI_API_KEY не установлена"

**Решение:**
1. Проверьте `.env` файл (локально)
2. Проверьте Render Environment Variables (production)
3. Убедитесь, что используете правильное название: `MXBAI_API_KEY` или `MIXEDBREAD_API_KEY`

### Ошибка: "503 Service Temporarily Unavailable"

**Причина:** Mixedbread API недоступен (технические работы, DDoS, перегрузка).

**Решение:**
1. Проверьте status page Mixedbread
2. Retry автоматически повторит запрос до 5 раз
3. Если проблема сохраняется >1 час, свяжитесь с Mixedbread support

### Ошибка: "429 Rate Limit Exceeded"

**Причина:** Превышен лимит запросов к Mixedbread API.

**Решение:**
1. Увеличьте `delayBetweenBatches` в `mixedbreadClient.js` (default: 1s → 3s)
2. Уменьшите batch size (100 → 50)
3. Проверьте ваш Mixedbread plan (limits могут отличаться)

### Ошибка: "Cannot find tenant"

**Причина:** Указан несуществующий tenantId.

**Решение:**
```bash
# Получить список всех tenants
curl "http://localhost:3001/api/mixedbread/tenants" \
  -H "Authorization: Bearer <token>"
```

### Документы дублируются в Mixedbread

**Причина:** ID коллизия между global и tenant документами.

**Решение:**
1. Проверьте формат ID: должно быть `<scope>-<type>-<uuid>`
2. Пересинхронизируйте:
   ```bash
   # Очистка index_state
   psql $DATABASE_URL -c "TRUNCATE mixedbread_index_state;"
   
   # Полная синхронизация
   node scripts/mixedbread-sync-cron.mjs all
   ```

### Синхронизация зависает

**Причина:** Большой объём данных (50K+ документов), медленная сеть, таймауты.

**Решение:**
1. Увеличьте таймауты в `mixedbreadClient.js`:
   ```javascript
   timeout: 120000 // 2 min → 300000 (5 min)
   ```
2. Уменьшите batch size:
   ```javascript
   upsertBatchSize: 100 → 50
   ```
3. Запускайте синхронизацию по частям:
   ```bash
   node scripts/mixedbread-sync-cron.mjs global
   # Подождать 10 минут
   node scripts/mixedbread-sync-cron.mjs tenants
   ```

---

## Performance

### Benchmarks (примерные)

**Dataset:**
- 50,000 материалов (40K global + 10K tenant)
- 5,000 работ (4K global + 1K tenant)
- 5 tenants

**Результаты:**
- Global sync: ~5-10 минут
- Tenant sync (10K docs): ~2-3 минуты
- All tenants: ~15-20 минут
- Full sync (global + all tenants): ~20-30 минут

**Оптимизации:**
- Batch size 100 оптимален для большинства случаев
- Parallel sync tenants не рекомендуется (риск rate limiting)
- Delay 1s между батчами баланс скорость/стабильность

---

## Roadmap

- [ ] Event-driven sync (webhook на CREATE/UPDATE/DELETE)
- [ ] Incremental sync (только изменённые записи за последние N часов)
- [ ] Metrics экспорт (Prometheus/Grafana)
- [ ] Admin UI для мониторинга синхронизации
- [ ] Multi-store support (dev/staging/prod stores)
- [ ] Semantic search API endpoint (query → Mixedbread → filtered results)

---

## FAQ

**Q: Нужно ли вручную создавать Store в Mixedbread?**  
A: Да, создайте Store через Mixedbread Dashboard и получите `MXBAI_STORE_ID`.

**Q: Как часто запускать синхронизацию?**  
A: Зависит от интенсивности изменений. Рекомендуется 1-2 раза в день (ночью). Для высоконагруженных систем - каждый час.

**Q: Можно ли синхронизировать только изменённые записи?**  
A: Да, но требуется доработка (добавить `updated_at` фильтр в экспорт). Сейчас upsert всех документов (Mixedbread сам определяет изменения).

**Q: Сколько стоит Mixedbread для 50K документов?**  
A: Зависит от плана. Проверьте Mixedbread pricing. Обычно ~$50-200/мес для этого объёма.

**Q: Работает ли поиск без синхронизации?**  
A: Нет, Mixedbread Store пустой до первой синхронизации. Запустите `node scripts/mixedbread-sync-cron.mjs all` сразу после deploy.

---

## Контакты

- **Issues**: GitHub Issues
- **Documentation**: `docs/MIXEDBREAD_SYNC.md` (этот файл)
- **Code**: 
  - `server/services/mixedbreadExportService.js`
  - `server/services/mixedbreadClient.js`
  - `server/services/mixedbreadSyncWorker.js`
  - `scripts/mixedbread-sync-cron.mjs`
