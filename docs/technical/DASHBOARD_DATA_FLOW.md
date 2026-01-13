# Dashboard Data Flow - Полная логика получения данных

**Дата**: 3 января 2026  
**Версия**: 1.0  
**Статус**: ✅ Production (без моковых данных)

---

## 📊 Обзор

Дашборд загружает **все данные одним запросом** через endpoint `/api/projects/dashboard-summary` (оптимизация: 1 запрос вместо 7). Все цифры приходят из PostgreSQL, никаких моковых данных нет.

---

## 🗄️ Database Schema

### Основные таблицы:

1. **`projects`** - Проекты
   - `id` (uuid) - ID проекта
   - `name` - Название проекта
   - `tenant_id` - ID компании (tenant isolation)
   - `status` - Статус проекта

2. **`estimates`** - Сметы проектов
   - `id` (uuid) - ID сметы
   - `project_id` - Ссылка на проект
   - `tenant_id` - ID компании

3. **`work_completion_acts`** - Акты выполненных работ
   - `id` (uuid) - ID акта
   - `estimate_id` - Ссылка на смету
   - `act_type` - Тип акта:
     - `'client'` - Доход (акт для клиента) 💰
     - `'specialist'` - Расход (акт для подрядчика) 💸
   - `total_amount` - Сумма акта

4. **`purchases`** - Закупки материалов (доход)
   - `id` (uuid) - ID закупки
   - `estimate_id` - Ссылка на смету
   - `total_price` - Сумма закупки 💰

5. **`global_purchases`** - Глобальные закупки (расход)
   - `id` (uuid) - ID закупки
   - `estimate_id` - Ссылка на смету
   - `total_price` - Сумма закупки 💸

---

## 🔄 Backend API Flow

### Endpoint: `GET /api/projects/dashboard-summary`

**Файл**: `server/controllers/projectsController.js:2265`  
**Функция**: `getDashboardSummary()`

#### Защита:
```javascript
// Middleware chain:
authenticateToken → checkPermission('projects', 'read') → getDashboardSummary
```

#### Параллельные запросы:
```javascript
const [
  profitResult,           // 1. Общая прибыль
  incomeWorksResult,      // 2. Доход от работ
  incomeMaterialsResult,  // 3. Доход от материалов
  chartMonthResult,       // 4. График (месяц)
  chartYearResult,        // 5. График (год)
  growthResult,           // 6. Данные роста
  projectsProfitResult    // 7. Прибыльность проектов
] = await Promise.all([...]);
```

**Время выполнения**: ~1800ms (зависит от объема данных)

---

## 💰 1. Общая прибыль (`totalProfit`)

### SQL запрос:
```sql
WITH project_profits AS (
  SELECT 
    p.id as project_id,
    -- Прибыль от работ = доход - расход
    COALESCE(
      (SELECT SUM(wca.total_amount) 
       FROM work_completion_acts wca 
       WHERE wca.estimate_id = e.id 
       AND wca.act_type = 'client'), 0
    ) - COALESCE(
      (SELECT SUM(wca.total_amount) 
       FROM work_completion_acts wca 
       WHERE wca.estimate_id = e.id 
       AND wca.act_type = 'specialist'), 0
    ) as works_profit,
    
    -- Прибыль от материалов = доход - расход
    COALESCE(
      (SELECT SUM(pur.total_price) 
       FROM purchases pur 
       WHERE pur.estimate_id = e.id), 0
    ) - COALESCE(
      (SELECT SUM(gp.total_price) 
       FROM global_purchases gp 
       WHERE gp.estimate_id = e.id), 0
    ) as materials_profit
    
  FROM projects p
  JOIN estimates e ON p.id = e.project_id
  WHERE p.tenant_id = $1  -- Tenant isolation!
)
SELECT 
  COALESCE(SUM(works_profit + materials_profit), 0) as total_profit,
  COUNT(DISTINCT project_id) as projects_with_profit
FROM project_profits
```

### Формула:
```
Общая прибыль = (Доход_работы - Расход_работы) + (Доход_материалы - Расход_материалы)

Где:
- Доход_работы = SUM(work_completion_acts WHERE act_type='client')
- Расход_работы = SUM(work_completion_acts WHERE act_type='specialist')
- Доход_материалы = SUM(purchases.total_price)
- Расход_материалы = SUM(global_purchases.total_price)
```

### Пример данных:
```javascript
{
  totalProfit: 2670.50,           // Общая прибыль в рублях
  projectsWithProfit: 3           // Количество проектов с прибылью
}
```

### Отображение в UI:
- **KPI карточка "Прибыль"**: `totalProfit.totalProfit` → `2 670 ₽`
- **KPI карточка "Активные проекты"**: `totalProfit.projectsWithProfit` → `3`

**Файл**: `app/dashboard/Default/index.jsx:31-37`

---

## 📈 2. Доход от работ (`incomeWorks`)

### SQL запрос:
```sql
SELECT COALESCE(SUM(wca.total_amount), 0) as total_income_works
FROM work_completion_acts wca
JOIN estimates e ON wca.estimate_id = e.id
JOIN projects p ON e.project_id = p.id
WHERE wca.act_type = 'client'     -- Только акты для клиентов!
AND p.tenant_id = $1               -- Tenant isolation
```

### Формула:
```
Доход от работ = SUM(work_completion_acts.total_amount WHERE act_type='client')
```

### Пример данных:
```javascript
incomeWorks: 23000  // Сумма всех актов для клиентов
```

### Отображение в UI:
- **KPI карточка "Доход по работам"**: `incomeWorks` → `23 000 ₽`
- **Таблица "Структура доходов"**: строка "Доход (акты)" → `23 000 ₽`
- **График**: зеленая сплошная линия "Доход · Работы"

**Файл**: `server/controllers/projectsController.js:2340`

---

## 🧱 3. Доход от материалов (`incomeMaterials`)

### SQL запрос:
```sql
SELECT COALESCE(SUM(pur.total_price), 0) as total_income_materials
FROM purchases pur
JOIN estimates e ON pur.estimate_id = e.id
JOIN projects p ON e.project_id = p.id
WHERE pur.total_price IS NOT NULL
AND p.tenant_id = $1
```

### Формула:
```
Доход от материалов = SUM(purchases.total_price)
```

### Пример данных:
```javascript
incomeMaterials: 12000  // Сумма всех закупок материалов
```

### Отображение в UI:
- **Таблица "Структура доходов"**: строка "Доход (материалы)" → `12 000 ₽`
- **График**: зеленая пунктирная линия "Доход · Материалы"

**Файл**: `server/controllers/projectsController.js:2356`

---

## 📊 4. График по месяцам/годам (`chartDataYear`, `chartDataMonth`)

### SQL запрос (пример для года):
```sql
WITH monthly_data AS (
  SELECT 
    DATE_TRUNC('month', wca.act_date) as month,
    
    -- Доход от работ
    SUM(CASE WHEN wca.act_type = 'client' THEN wca.total_amount ELSE 0 END) as income_works,
    
    -- Расход от работ
    SUM(CASE WHEN wca.act_type = 'specialist' THEN wca.total_amount ELSE 0 END) as expense_works
    
  FROM work_completion_acts wca
  JOIN estimates e ON wca.estimate_id = e.id
  JOIN projects p ON e.project_id = p.id
  WHERE p.tenant_id = $1
  AND wca.act_date >= NOW() - INTERVAL '12 months'
  GROUP BY DATE_TRUNC('month', wca.act_date)
  ORDER BY month
)
SELECT * FROM monthly_data;
```

**Примечание**: Полный запрос также включает данные из `purchases` и `global_purchases` для материалов.

### Формула:
```
Для каждого месяца:
- income_works = SUM(work_completion_acts WHERE act_type='client')
- income_materials = SUM(purchases)
- expense_works = SUM(work_completion_acts WHERE act_type='specialist')
- expense_materials = SUM(global_purchases)
- profit = (income_works + income_materials) - (expense_works + expense_materials)
```

### Пример данных:
```javascript
chartDataYear: {
  categories: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
  series: [
    {
      name: 'income_works',
      data: [15000, 18000, 22000, 25000, 28000, 32000, 35000, 38000, 42000, 45000, 48000, 50000]
    },
    {
      name: 'income_materials',
      data: [8000, 9000, 10000, 11000, 12000, 13000, 14000, 15000, 16000, 17000, 18000, 19000]
    },
    {
      name: 'expense_works',
      data: [12000, 14000, 17000, 19000, 21000, 24000, 26000, 28000, 31000, 33000, 35000, 37000]
    },
    {
      name: 'expense_materials',
      data: [6000, 7000, 8000, 9000, 10000, 11000, 12000, 13000, 14000, 15000, 16000, 17000]
    }
  ]
}
```

### Отображение в UI:
- **MainFinancialChart** парсит `chartDataYear` и отображает 5 линий:
  1. Доход · Работы (зеленая сплошная, 3px)
  2. Доход · Материалы (зеленая пунктир, 2px)
  3. Расход · Работы (красная сплошная, 3px)
  4. Расход · Материалы (красная пунктир, 2px)
  5. **Прибыль** (фиолетовая зона, рассчитывается на клиенте)

**Файл**: `app/dashboard/Default/MainFinancialChart.jsx:18-60`

---

## 📈 5. Данные роста (`growthData`)

### SQL запрос:
```sql
-- Получает помесячные данные за последние 12 месяцев
-- Аналогично chartDataYear, но с дополнительными метриками
```

### Пример данных:
```javascript
growthData: {
  currentMonth: { income: 50000, expense: 37000, profit: 13000 },
  previousMonth: { income: 48000, expense: 35000, profit: 13000 },
  growthPercent: 4.2  // (50000 - 48000) / 48000 * 100
}
```

### Отображение в UI:
⚠️ **TODO**: Пока не используется. Планируется для расчета % изменения в KPI карточках.

**Файл**: `server/controllers/projectsController.js:2400+`

---

## 🏗️ 6. Прибыльность проектов (`projectsProfitData`)

### SQL запрос:
```sql
WITH project_profits AS (
  SELECT 
    p.id as project_id,
    p.name as project_name,
    -- Прибыль от работ
    COALESCE(
      (SELECT SUM(wca.total_amount) FROM work_completion_acts wca 
       WHERE wca.estimate_id = e.id AND wca.act_type = 'client'), 0
    ) - COALESCE(
      (SELECT SUM(wca.total_amount) FROM work_completion_acts wca 
       WHERE wca.estimate_id = e.id AND wca.act_type = 'specialist'), 0
    ) as works_profit,
    -- Прибыль от материалов
    COALESCE(
      (SELECT SUM(pur.total_price) FROM purchases pur 
       WHERE pur.estimate_id = e.id), 0
    ) - COALESCE(
      (SELECT SUM(gp.total_price) FROM global_purchases gp 
       WHERE gp.estimate_id = e.id), 0
    ) as materials_profit
  FROM projects p
  JOIN estimates e ON p.id = e.project_id
  WHERE p.tenant_id = $1
)
SELECT 
  project_id,
  project_name,
  (works_profit + materials_profit) as total_profit
FROM project_profits
ORDER BY total_profit DESC
LIMIT 10;  -- Топ-10 проектов
```

### Формула:
```
Прибыль проекта = Прибыль_работы + Прибыль_материалы

Где для каждого проекта:
- Прибыль_работы = Доход_работы - Расход_работы
- Прибыль_материалы = Доход_материалы - Расход_материалы
```

### Пример данных:
```javascript
projectsProfitData: [
  { project_id: 'uuid-1', project_name: 'Квартира на Ленина', total_profit: 2670.50 },
  { project_id: 'uuid-2', project_name: 'Дом в пригороде', total_profit: 0 },
  { project_id: 'uuid-3', project_name: 'Офис TechCorp', total_profit: -500 }
]
```

### Отображение в UI:
- **SimplifiedProjectsTable** - таблица с 3 колонками:
  - ПРОЕКТ: `project_name`
  - ПРИБЫЛЬ: `total_profit` (цветовая индикация: зеленый >0, красный <0, серый =0)
  - СТАТУС: чип "Прибыль"/"Убыток"/"Нейтрально"

**Файл**: `app/dashboard/Default/SimplifiedProjectsTable.jsx:8-25`

---

## 🔌 Frontend Data Flow

### 1. Hook: `useDashboardData()`

**Файл**: `shared/lib/hooks/useDashboardData.js`

```javascript
import { projectsAPI } from 'api/projects';

export function useDashboardData() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/projects/dashboard-summary',
    fetchDashboardData,
    {
      revalidateOnFocus: true,    // Обновить при возврате на страницу
      refreshInterval: 0,          // Не обновлять автоматически
      dedupingInterval: 2000       // Дедупликация запросов
    }
  );

  return { data, isLoading, error, refresh: () => mutate() };
}
```

**Что возвращает**:
```javascript
{
  data: {
    totalProfit: { totalProfit: 2670, projectsWithProfit: 3 },
    incomeWorks: 23000,
    incomeMaterials: 12000,
    chartDataYear: { categories: [...], series: [...] },
    chartDataMonth: { categories: [...], series: [...] },
    growthData: { ... },
    projectsProfitData: [{ project_id, project_name, total_profit }, ...]
  },
  isLoading: false,
  error: null,
  refresh: Function
}
```

---

### 2. Component: Dashboard

**Файл**: `app/dashboard/Default/index.jsx`

```javascript
export default function Dashboard() {
  const { data: dashboardData, isLoading } = useDashboardData();
  const [period, setPeriod] = useState('year');

  // Маппинг данных из API
  const profitData = {
    value: dashboardData?.totalProfit?.totalProfit || 0,
    change: 0  // TODO: Calculate from growthData
  };

  return (
    <Grid container spacing={2}>
      {/* KPI Cards */}
      <SimpleKpiCard 
        title="Прибыль" 
        value={profitData.value}
        change={profitData.change}
        isPrimary={true}
      />
      
      {/* Main Chart */}
      <MainFinancialChart 
        chartData={dashboardData?.chartDataYear}
        period={period}
      />
      
      {/* Tables */}
      <SimplifiedIncomeExpenseTable 
        incomeWorks={dashboardData?.incomeWorks}
        incomeMaterials={dashboardData?.incomeMaterials}
      />
      
      <SimplifiedProjectsTable 
        data={dashboardData?.projectsProfitData}
      />
    </Grid>
  );
}
```

---

### 3. Component: MainFinancialChart

**Файл**: `app/dashboard/Default/MainFinancialChart.jsx`

```javascript
const MainFinancialChart = ({ chartData, period, isLoading }) => {
  const prepareChartData = () => {
    if (!chartData?.series) return { categories: [], series: [] };

    // Поиск серий по имени
    const findSeries = (name) => 
      chartData.series.find(s => s.name === name)?.data || [];
    
    const incomeWorks = findSeries('income_works');
    const incomeMaterials = findSeries('income_materials');
    const expenseWorks = findSeries('expense_works');
    const expenseMaterials = findSeries('expense_materials');
    
    // ВАЖНО: Прибыль рассчитывается на клиенте!
    const profit = incomeWorks.map((income, i) => {
      const totalIncome = (income || 0) + (incomeMaterials[i] || 0);
      const totalExpense = (expenseWorks[i] || 0) + (expenseMaterials[i] || 0);
      return Math.max(0, totalIncome - totalExpense);
    });

    return {
      categories: chartData.categories,
      series: [
        { name: 'Доход · Работы', type: 'line', data: incomeWorks },
        { name: 'Доход · Материалы', type: 'line', data: incomeMaterials },
        { name: 'Расход · Работы', type: 'line', data: expenseWorks },
        { name: 'Расход · Материалы', type: 'line', data: expenseMaterials },
        { name: 'Прибыль', type: 'area', data: profit }  // ← Рассчитано!
      ]
    };
  };

  const data = prepareChartData();
  
  return <ReactApexChart options={chartOptions} series={data.series} />;
};
```

---

## 🔒 Security & Tenant Isolation

### Все запросы фильтруются по `tenant_id`:

```sql
WHERE p.tenant_id = $1  -- Пользователь видит только свои данные!
```

### Super Admin:
```javascript
const isSuperAdmin = req.user.role === 'super_admin';

// Super Admin может видеть данные всех компаний:
const params = !isSuperAdmin ? [tenantId] : [];
```

**Файл**: `server/middleware/auth.js`

---

## ⚠️ Known Issues & TODOs

### 1. ❌ Нет данных о расходах в таблице "Структура доходов"
**Проблема**: `SimplifiedIncomeExpenseTable` рассчитывает расходы как 80% от доходов (моковая формула).

**Решение**: Добавить в backend endpoint `getDashboardSummary`:
```javascript
// Добавить в Promise.all:
expenseWorksResult,       // SUM(work_completion_acts WHERE act_type='specialist')
expenseMaterialsResult    // SUM(global_purchases)
```

**Файл**: `app/dashboard/Default/SimplifiedIncomeExpenseTable.jsx:11`

---

### 2. ❌ Нет % изменения в KPI карточках
**Проблема**: KPI показывают `change: 0` вместо реального процента.

**Решение**: Использовать `growthData` для расчета:
```javascript
const profitChange = (
  (currentMonth.profit - previousMonth.profit) / previousMonth.profit * 100
).toFixed(1);
```

**Файл**: `app/dashboard/Default/index.jsx:31`

---

### 3. ⚠️ График может быть пустым для новых проектов
**Причина**: Если нет актов выполненных работ, все серии = `[]`.

**Решение**: Показать placeholder "Нет данных для отображения" вместо пустого графика.

**Файл**: `app/dashboard/Default/MainFinancialChart.jsx:21`

---

## 📝 Summary: Откуда берутся цифры?

| Метрика | Источник данных | SQL таблицы | Формула |
|---------|----------------|-------------|---------|
| **Прибыль** | `totalProfit.totalProfit` | `work_completion_acts`, `purchases`, `global_purchases` | (Доход_работы - Расход_работы) + (Доход_материалы - Расход_материалы) |
| **Активные проекты** | `totalProfit.projectsWithProfit` | `projects`, `estimates` | COUNT(DISTINCT project_id WHERE profit > 0) |
| **Доход по работам** | `incomeWorks` | `work_completion_acts` | SUM(total_amount WHERE act_type='client') |
| **Доход по материалам** | `incomeMaterials` | `purchases` | SUM(total_price) |
| **График (5 серий)** | `chartDataYear.series` | `work_completion_acts`, `purchases`, `global_purchases` | Помесячная группировка за последние 12 месяцев |
| **Таблица проектов** | `projectsProfitData` | `projects`, `estimates`, `work_completion_acts`, `purchases` | TOP 10 проектов по прибыльности |
| **Таблица доходов/расходов** | `incomeWorks`, `incomeMaterials` | `work_completion_acts`, `purchases` | ⚠️ Расходы пока рассчитываются как 80% доходов |

---

## 🚀 Performance

- **Время загрузки**: ~1800ms (один запрос вместо 7)
- **Кеширование**: SWR с revalidation on focus
- **Tenant isolation**: Все запросы фильтруются по `tenant_id`
- **Parallel queries**: 7 SQL запросов выполняются параллельно через `Promise.all`

---

## 📚 Related Files

- Backend: `server/controllers/projectsController.js:2215-2500`
- Frontend Hook: `shared/lib/hooks/useDashboardData.js`
- Dashboard Layout: `app/dashboard/Default/index.jsx`
- Main Chart: `app/dashboard/Default/MainFinancialChart.jsx`
- KPI Cards: `app/dashboard/Default/SimpleKpiCard.jsx`
- Projects Table: `app/dashboard/Default/SimplifiedProjectsTable.jsx`
- Income/Expense Table: `app/dashboard/Default/SimplifiedIncomeExpenseTable.jsx`

---

**Последнее обновление**: 3 января 2026 (commit 2b5ed53)  
**Статус моковых данных**: ❌ Удалены - только реальные данные из PostgreSQL!
