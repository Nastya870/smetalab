# 🔍 Детальный анализ кода перед оптимизацией

**Дата**: 8 января 2026, 21:10  
**Цель**: Понять точную структуру данных для безопасной оптимизации

---

## ✅ Анализ завершён

### 1. Как вызывается `findByIdWithDetails`

**Вызов из controller**:
```javascript
// server/controllers/estimatesController.js:60
const estimate = await estimatesRepository.findByIdWithDetails(id, tenantId);
```

**Ответ возвращается как есть**:
```javascript
// server/controllers/estimatesController.js:77
res.status(StatusCodes.OK).json(estimate);
```

### 2. Как frontend загружает данные

**API вызов**:
```javascript
// app/estimates/EstimateWithSidebar.jsx:1730 
const estimate = await estimatesAPI.getById(estimateIdToLoad);
```

### 3. Структура данных из `findByIdWithDetails`

**Текущий формат (старый код)**:
```javascript
{
  id: '...',
  name: 'Смета...',
  estimate_type: '...',
  project_name: '...',
  // ... другие поля estimate
  
  items: [  // Массив позиций сметы
    {
      id: '...',
      position_number: 1,
      name: 'Работа 1',
      quantity: 10,
      unit_price: 500,
      // ... другие поля item
      
      materials: [  // ❗ ВАЖНО: Массив материалов для позиции
        {
          id: '...',
          material_id: '123',
          sku: '...',
          quantity: 5,
          unit_price: 100,
          material_name: 'Материал 1',
          unit: 'кг',
          consumption_coefficient: 0.5,
          auto_calculate: true,
          image: '...'
        }
      ]
    }
  ]
}
```

### 4. Как frontend обратывает результат

**Обработка items** (EstimateWithSidebar.jsx:1760-1810):
```javascript
estimate.items.forEach((item) => {
  // ... группировка по секциям
  
  section.items.push({
    workId: item.work_id || item.id,
    code: item.code,
    name: item.name,
    // ...
    
    // ❗ КРИТИЧНО: Frontend ожидает item.materials как массив!
    materials: item.materials.map(m => ({
      id: m.material_id,
      material_id: m.material_id,
      sku: m.sku,
      name: m.material_name,  // ❗ material_name
      unit: m.unit,
      quantity: m.quantity,
      price: m.unit_price || m.price,
      consumption: m.consumption_coefficient || m.consumption,
      auto_calculate: m.auto_calculate,
      image: m.image,
      // ...
    }))
  });
});
```

---

## 🔑 Ключевые находки

### Проблема в предыдущей оптимизации:

1. **Структура групп��ровки** была правильная ✅
2. **Названия полей** были слегка другими ❌
   - Было: `material_name`
   - Стало: `material_name` ✅ (правильно!)

3. **Вложенность materials** ✅ правильная

### Почему загрузка сломалась?

Скорее всего проблема была в **одном из этих аспектов**:

1. **NULL значения** - если у estimate нет items, `result.rows[0]` всё равно возвращает estimate  
   но при группировке `if (!row.item_id) continue` пропускает строки
   
2. **Пустой массив items** - если у сметы нет позиций, frontend получал `{ ...estimate, items: [] }`  
   что могло быть некорректно обработано

3. **Лишние поля** - возможно добавили новые поля которых frontend не ожидал

---

## ✅ ПРАВИЛЬНОЕ РЕШЕНИЕ

### Используем консервативный подход (Подход 1):

**Оптимизируем только загрузку материалов** (N запросов → 1 запрос):

```javascript
export async function findByIdWithDetails(estimateId, tenantId) {
  try {
    console.log(`[findByIdWithDetails] Loading estimate ${estimateId} for tenant ${tenantId}`);
    
    const startTime = Date.now();
    
    // 1. Получаем основную информацию о смете (как было)
    const estimateQuery = `
      SELECT e.*, p.name as project_name
      FROM estimates e
      LEFT JOIN projects p ON e.project_id = p.id
      WHERE e.id = $1 AND e.tenant_id = $2
    `;
    
    const estimateResult = await pool.query(estimateQuery, [estimateId, tenantId]);
    
    if (estimateResult.rows.length === 0) {
      console.log(`[findByIdWithDetails] Estimate not found`);
      return null;
    }
    
    const estimate = estimateResult.rows[0];
    console.log(`[findByIdWithDetails] Found estimate: ${estimate.name}`);
    
    // 2. Получаем позиции сметы (как было)
    const itemsQuery = `
      SELECT * FROM estimate_items 
      WHERE estimate_id = $1 
      ORDER BY position_number
    `;
    
    const itemsResult = await pool.query(itemsQuery, [estimateId]);
    console.log(`[findByIdWithDetails] Found ${itemsResult.rows.length} items`);
    
    // 3. ✅ ОПТИМИЗАЦИЯ: Загружаем материалы ОДНИМ запросом для ВСЕХ позиций
    if (itemsResult.rows.length > 0) {
      const itemIds = itemsResult.rows.map(item => item.id);
      
      const materialsQuery = `
        SELECT 
          eim.id,
          eim.estimate_item_id,
          eim.quantity,
          eim.unit_price,
          eim.total_price,
          eim.consumption_coefficient,
          eim.auto_calculate,
          eim.is_required,
          eim.notes,
          eim.weight,
          eim.total_weight,
          m.id as material_id,
          m.sku,
          m.name as material_name,
          m.unit,
          m.category,
          m.price as material_base_price,
          m.consumption,
          m.image
        FROM estimate_item_materials eim
        JOIN materials m ON eim.material_id = m.id
        WHERE eim.estimate_item_id = ANY($1)
        ORDER BY eim.estimate_item_id, m.name
      `;
      
      const materialsResult = await pool.query(materialsQuery, [itemIds]);
      
      // Группируем материалы по estimate_item_id
      const materialsByItemId = new Map();
      for (const material of materialsResult.rows) {
        if (!materialsByItemId.has(material.estimate_item_id)) {
          materialsByItemId.set(material.estimate_item_id, []);
        }
        
        materialsByItemId.get(material.estimate_item_id).push({
          id: material.id,
          quantity: material.quantity,
          unit_price: material.unit_price,
          total_price: material.total_price,
          total: parseFloat((material.quantity * material.unit_price).toFixed(2)),
          consumption_coefficient: material.consumption_coefficient,
          auto_calculate: material.auto_calculate,
          is_required: material.is_required,
          notes: material.notes,
          weight: material.weight,
          total_weight: material.total_weight,
          material_id: material.material_id,
          sku: material.sku,
          material_name: material.material_name,
          unit: material.unit,
          category: material.category,
          material_base_price: material.material_base_price,
          price: material.unit_price || material.material_base_price,
          consumption: material.consumption,
          image: material.image
        });
      }
      
      // Добавляем материалы к каждой позиции
      const items = itemsResult.rows.map(item => ({
        ...item,
        final_price: item.final_price || parseFloat((item.quantity * item.unit_price).toFixed(2)),
        materials: materialsByItemId.get(item.id) || []
      }));
      
      const loadTime = Date.now() - startTime;
      console.log(`[findByIdWithDetails] ✅ Loaded estimate with ${items.length} items in ${loadTime}ms (optimized)`);
      
      return {
        ...estimate,
        items
      };
    }
    
    // Если позиций нет - возвращаем смету без items
    return {
      ...estimate,
      items: []
    };
    
  } catch (error) {
    console.error('[findByIdWithDetails] ❌ Fatal error:', error);
    throw error;
  }
}
```

---

## 📊 Преимущества Подхода 1

✅ **Безопасно**: Минимальные изменения - только материалы  
✅ **Эффективно**: N+2 → 3 запроса (вместе N+2 → 1)  
✅ **Совместимо**: Полностью совместимо с frontend  
✅ **Прогноз прироста**: 5-7x для смет с материалами  

**Для сметы с 100 позициями**:
- Было: 102 запроса (1 + 1 + 100)
- Стало: 3 запроса (1 + 1 + 1)
- **Экономия: 99 запросов!**

---

## 🎯 Следующие шаги

1. Применить Подход 1 (консервативный)
2. Протестировать на dev
3. Если работает - закоммитить
4. В следующей итерации можно попробовать полный JOIN (если понадобится)

