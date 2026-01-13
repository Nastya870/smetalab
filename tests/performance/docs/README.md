# ⚡ Performance Tests (k6)

**Статус:** ⏳ Не настроено

---

## 🎯 Что будет тестироваться?

### 1. Load Testing (Нагрузочное тестирование)
- [ ] Auth endpoints (login, register, refresh)
- [ ] CRUD operations (projects, estimates, materials)
- [ ] Read-heavy scenarios (списки, поиск)
- [ ] Write-heavy scenarios (создание, обновление)

### 2. Stress Testing (Стресс-тестирование)
- [ ] Пиковая нагрузка (max users)
- [ ] Деградация при перегрузке
- [ ] Recovery после стресса

### 3. Spike Testing (Резкие всплески)
- [ ] Внезапное увеличение пользователей
- [ ] Реакция системы на спайки

### 4. Soak Testing (Длительная нагрузка)
- [ ] Стабильность при длительной работе
- [ ] Утечки памяти
- [ ] Деградация производительности

---

## 🚀 Установка k6

### Windows
```powershell
# Через Chocolatey
choco install k6

# Или скачать с https://k6.io/docs/getting-started/installation/
```

### Проверка установки
```powershell
k6 version
```

---

## 📁 Структура Performance тестов

```
tests/performance/
├── load/
│   ├── auth-load.js           # Нагрузка на auth
│   ├── crud-load.js           # Нагрузка на CRUD
│   └── read-heavy-load.js     # Read-heavy сценарии
├── stress/
│   ├── auth-stress.js
│   └── api-stress.js
├── spike/
│   └── sudden-spike.js
├── soak/
│   └── long-running.js
└── scenarios/
    ├── user-journey.js        # Реалистичный user flow
    └── mixed-workload.js      # Смешанная нагрузка
```

---

## 📊 Базовые метрики

### Целевые значения (baseline)

| Метрика | Target | Acceptable | Critical |
|---------|--------|------------|----------|
| Response Time (p95) | < 200ms | < 500ms | > 1s |
| Response Time (p99) | < 500ms | < 1s | > 2s |
| Throughput | > 100 req/s | > 50 req/s | < 20 req/s |
| Error Rate | < 0.1% | < 1% | > 5% |
| CPU Usage | < 70% | < 85% | > 95% |
| Memory Usage | < 70% | < 85% | > 95% |

---

## 🔧 Конфигурация

**k6.config.js:**
```javascript
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Разогрев: 10 users
    { duration: '1m', target: 50 },   // Рост: 50 users
    { duration: '3m', target: 50 },   // Плато: 50 users
    { duration: '30s', target: 0 },   // Спад: 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};
```

---

## 🚀 Запуск

### Smoke test (быстрая проверка)
```powershell
npm run test:smoke
# или
k6 run tests/performance/load/auth-load.js --vus 1 --duration 30s
```

### Load test
```powershell
npm run test:load
# или
.\test-scripts\performance-tests\scripts\run-load-test.ps1
```

### Stress test
```powershell
npm run test:stress
# или
.\test-scripts\performance-tests\scripts\run-stress-test.ps1
```

### С выводом в файл
```powershell
k6 run tests/performance/load/auth-load.js --out json=results.json
```

---

## 📝 Пример теста

**tests/performance/load/auth-load.js:**
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = 'http://localhost:3001/api';

export default function () {
  // 1. Register
  const registerPayload = JSON.stringify({
    email: `user-${__VU}-${__ITER}@test.com`,
    password: 'testpass123',
    firstName: 'Test',
    lastName: 'User',
    companyName: 'Test Company',
  });

  const registerRes = http.post(`${BASE_URL}/auth/register`, registerPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(registerRes, {
    'register status is 201': (r) => r.status === 201,
    'register has token': (r) => r.json('token') !== undefined,
  });

  // 2. Login
  const loginPayload = JSON.stringify({
    email: `user-${__VU}-${__ITER}@test.com`,
    password: 'testpass123',
  });

  const loginRes = http.post(`${BASE_URL}/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login has token': (r) => r.json('token') !== undefined,
  });

  const token = loginRes.json('token');

  // 3. Get user info
  const meRes = http.get(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  check(meRes, {
    'me status is 200': (r) => r.status === 200,
    'me has user': (r) => r.json('user') !== undefined,
  });

  sleep(1);
}
```

---

## 📊 Анализ результатов

### Метрики k6
```
✓ register status is 201
✓ register has token
✓ login status is 200
✓ login has token
✓ me status is 200

checks.........................: 100.00%
data_received..................: 1.2 MB
data_sent......................: 400 KB
http_req_duration..............: avg=150ms  p(95)=250ms p(99)=400ms
http_req_failed................: 0.00%
http_reqs......................: 1500
iteration_duration.............: avg=1.2s
iterations.....................: 500
vus............................: 50
```

### Интерпретация
- ✅ **p(95) < 500ms** — отлично!
- ✅ **Error rate 0%** — стабильно
- ⚠️ **Throughput 125 req/s** — хорошо, но можно лучше
- ⚠️ **Avg duration 150ms** — приемлемо

---

## 🎓 Best Practices

### 1. Реалистичные сценарии
```javascript
export default function () {
  // User journey
  login();
  sleep(2);
  
  browseProjec();
  sleep(3);
  
  createEstimate();
  sleep(5);
  
  addMaterials();
  sleep(2);
  
  exportPDF();
  sleep(1);
}
```

### 2. Динамические данные
```javascript
const email = `user-${__VU}-${Date.now()}@test.com`;
```

### 3. Cleanup после тестов
```javascript
export function teardown(data) {
  // Удалить тестовые данные
  http.del(`${BASE_URL}/cleanup-test-data`);
}
```

---

## 🐛 Troubleshooting

### Ошибка "Connection refused"
**Решение:** Убедитесь что backend запущен на `localhost:3001`

### Высокий error rate
**Решение:** Уменьшите `target` в stages или увеличьте мощность сервера

### k6 не устанавливается
**Решение:** Скачайте бинарник напрямую с [k6.io](https://k6.io/docs/getting-started/installation/)

---

## 📈 Continuous Performance Testing

### Интеграция с CI/CD
```yaml
# .github/workflows/performance.yml
name: Performance Tests

on:
  schedule:
    - cron: '0 0 * * *'  # Каждую ночь

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: grafana/setup-k6-action@v1
      - run: k6 run tests/performance/load/auth-load.js
```

---

## 🎯 План внедрения

1. ⏳ Установить k6
2. ⏳ Создать базовый load test для auth
3. ⏳ Создать load test для CRUD operations
4. ⏳ Определить baseline метрики
5. ⏳ Настроить smoke tests в CI/CD
6. ⏳ Регулярные performance tests (nightly)
7. ⏳ Мониторинг деградации производительности

---

## 📖 См. также

- **[k6 Docs](https://k6.io/docs/)** — официальная документация
- **[Grafana Cloud k6](https://grafana.com/products/cloud/k6/)** — визуализация результатов
- **[TESTING_GUIDE.md](../../TESTING_GUIDE.md)** — главное руководство
- **[TODO.md](../../TODO.md)** — полный план развития
