# 🚀 Деплой оптимизации на тестовую ветку

**Дата**: 8 января 2026, 21:40  
**Цель**: Безопасный деплой оптимизации N+1

---

## 📋 Шаг 1: Создать тестовую ветку

```bash
# Проверяем текущий статус
git status

# Создаём тестовую ветку от текущей
git checkout -b feature/optimize-n-plus-1

# Или если уже есть изменения, сначала коммитим:
git add server/repositories/estimatesRepository.js
git add docs/*.md
git add scripts/analyze-performance.mjs

git commit -m "feat: optimize N+1 queries for remote database

- Replace N parallel queries with single batch query using ANY()
- Reduces network round-trips from 114 to 3
- Expected 30-40x performance improvement for remote DB
- Add benchmark script to verify optimization

Fixes performance issue when DB is on Render (remote)"
```

---

## 📋 Шаг 2: Запушить в GitHub

```bash
# Пушим тестовую ветку
git push origin feature/optimize-n-plus-1

# Если ветка новая, git предложит команду для tracking:
git push --set-upstream origin feature/optimize-n-plus-1
```

---

## 📋 Шаг 3: Создать Pull Request (вручную через GitHub)

### В браузере:

1. Откройте GitHub репозиторий
2. Вы увидите уведомление: **"feature/optimize-n-plus-1 had recent pushes"**
3. Нажмите **"Compare & pull request"**
4. Заполните PR:
   ```
   Title: ⚡ Optimize N+1 queries for remote database (30-40x faster)
   
   Description:
   
   ## 🎯 Problem
   - Loading estimates with 112 items took 6-23 seconds
   - Root cause: N+1 queries (112 parallel) to remote DB on Render
   - Each query has 100-300ms network latency
   
   ## ✅ Solution
   - Replace N parallel queries with 1 batch query using `WHERE ANY()`
   - Reduces network round-trips: 114 → 3
   - SQL execution also faster: 6s → 0.15s
   
   ## 📊 Expected Result
   - Loading time: 23s → 0.7s (33x faster)
   - Works well with remote database (latency insensitive)
   
   ## 🧪 Testing
   - [x] Benchmark shows 40x improvement
   - [x] Code structure preserved (compatible with frontend)
   - [ ] Manual testing in browser needed
   
   ## 📝 Changes
   - `server/repositories/estimatesRepository.js`: batch query implementation
   - `scripts/analyze-performance.mjs`: benchmark script
   - `docs/OPTIMIZATION_FINAL_SUCCESS.md`: documentation
   ```

5. **Base branch**: `main` (или `master`)
6. **Compare branch**: `feature/optimize-n-plus-1`
7. Нажмите **"Create pull request"**

---

## 📋 Шаг 4: Деплой на Render (тестовая среда)

### Вариант А: Через Render Dashboard (рекомендуется для теста)

1. Откройте [Render Dashboard](https://dashboard.render.com)
2. Найдите ваш backend service
3. **Settings** → **Branch**
4. Измените branch на `feature/optimize-n-plus-1`
5. Render автоматически задеплоит новую ветку
6. Дождитесь успешного деплоя

### Вариант Б: Создать отдельный test service

1. В Render Dashboard: **New** → **Web Service**
2. Укажите тот же репозиторий
3. **Branch**: `feature/optimize-n-plus-1`
4. **Name**: `smetalab-backend-test`
5. Environment: скопируйте из production
6. **Create Web Service**

---

## 🧪 Шаг 5: Тестирование

### После деплоя на Render:

```bash
# 1. Обновите .env для использования тестового бэкенда
# VITE_API_URL=https://smetalab-backend-test.onrender.com

# 2. Запустите frontend локально
npm run dev

# 3. Откройте смету с многими позициями
# 4. Проверьте время загрузки в DevTools → Network
```

**Ожидаемый результат на Render**:
- Загрузка сметы: **< 1 секунда** ✅
- В логах Render:
  ```
  [findByIdWithDetails] ✅ Loaded 112 items with 237 materials (batch query)
  ```

---

## ✅ Шаг 6: Мердж в main (после успешного теста)

### Если всё работает:

```bash
# Через GitHub UI:
# 1. Откройте PR
# 2. Нажмите "Merge pull request"
# 3. Confirm merge

# Через командную строку:
git checkout main
git merge feature/optimize-n-plus-1
git push origin main
```

### Production деплой:

Render автоматически задеплоит `main` ветку.

---

## 🔄 Откат (если что-то пошло не так)

### На Render:

1. **Settings** → **Branch** → вернуть на `main`
2. Render откатится к предыдущей версии

### В Git:

```bash
# Откатить коммит
git revert HEAD
git push origin feature/optimize-n-plus-1

# Или удалить ветку
git branch -D feature/optimize-n-plus-1
git push origin --delete feature/optimize-n-plus-1
```

---

## 📊 Мониторинг после деплоя

### Важные метрики:

1. **Response time** `/api/estimates/:id`:
   - До: 6-23 сек
   - После: < 1 сек ✅

2. **Database connections**:
   - До: 114 одновременно
   - После: 3 максимум ✅

3. **Memory usage**: должно остаться прежним

4. **Error rate**: должен быть 0%

### Логи в Render:

Смотрите на:
```
[findByIdWithDetails] ✅ Loaded N items with M materials (batch query)
```

Если видите ошибки - сразу откатывайтесь!

---

## 🎯 Итоговый чеклист:

- [ ] Создана ветка `feature/optimize-n-plus-1`
- [ ] Закоммичены изменения
- [ ] Запушено в GitHub
- [ ] Создан Pull Request
- [ ] Задеплоено на Render test environment
- [ ] Протестировано вручную (< 1 сек загрузка)
- [ ] Проверены логи (нет ошибок)
- [ ] Смерджено в main
- [ ] Production деплой успешен

---

**Готово к деплою!** 🚀

Хотите чтобы я помог с какими-то конкретными шагами?

