/**
 * Проверка индексов и анализ производительности
 */

import db from '../server/config/database.js';

const pool = db.pool;

async function analyzePerformance() {
    try {
        console.log('🔍 АНАЛИЗ ПРОИЗВОДИТЕЛЬНОСТИ\n');
        console.log('═══════════════════════════════════════\n');

        // 1. Проверка индексов на критичных таблицах
        console.log('1️⃣ Проверка индексов:\n');

        const indexesQuery = `
      SELECT 
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN ('estimate_items', 'estimate_item_materials', 'materials')
      ORDER BY tablename, indexname;
    `;

        const indexes = await pool.query(indexesQuery);

        console.log('📊 Индексы в БД:');
        console.log('─────────────────────────────────────');

        const tableGroups = {};
        for (const idx of indexes.rows) {
            if (!tableGroups[idx.tablename]) {
                tableGroups[idx.tablename] = [];
            }
            tableGroups[idx.tablename].push(idx);
        }

        for (const [table, idxs] of Object.entries(tableGroups)) {
            console.log(`\n📋 ${table}:`);
            for (const idx of idxs) {
                console.log(`   ✓ ${idx.indexname}`);
                console.log(`     ${idx.indexdef}`);
            }
        }

        console.log('\n');
        console.log('═══════════════════════════════════════\n');

        // 2. Найдём смету для тестирования
        console.log('2️⃣ Поиск тестовой сметы:\n');

        const findEstimate = `
      SELECT 
        e.id, 
        e.name, 
        e.tenant_id,
        COUNT(ei.id) as items_count,
        COUNT(DISTINCT eim.id) as materials_count
      FROM estimates e
      LEFT JOIN estimate_items ei ON e.id = ei.estimate_id
      LEFT JOIN estimate_item_materials eim ON ei.id = eim.estimate_item_id
      GROUP BY e.id
      HAVING COUNT(ei.id) > 0
      ORDER BY COUNT(ei.id) DESC
      LIMIT 1
    `;

        const testEstimate = await pool.query(findEstimate);

        if (testEstimate.rows.length === 0) {
            console.log('❌ Нет смет для тестирования');
            process.exit(0);
        }

        const estimate = testEstimate.rows[0];
        console.log(`📊 Тестовая смета:`);
        console.log(`   ID: ${estimate.id}`);
        console.log(`   Название: ${estimate.name}`);
        console.log(`   Позиций: ${estimate.items_count}`);
        console.log(`   Материалов: ${estimate.materials_count}`);
        console.log(`   Tenant: ${estimate.tenant_id}`);

        console.log('\n');
        console.log('═══════════════════════════════════════\n');

        // 3. Получаем ID всех позиций для batch запроса
        console.log('3️⃣ Подготовка данных для сравнения:\n');

        const itemsQuery = `
      SELECT id FROM estimate_items 
      WHERE estimate_id = $1 
      ORDER BY position_number
    `;

        const items = await pool.query(itemsQuery, [estimate.id]);
        const itemIds = items.rows.map(row => row.id);

        console.log(`📦 Позиций для анализа: ${itemIds.length}`);
        console.log(`📦 IDs: ${itemIds.slice(0, 5).join(', ')}${itemIds.length > 5 ? '...' : ''}`);

        console.log('\n');
        console.log('═══════════════════════════════════════\n');

        // 4. EXPLAIN ANALYZE для СТАРОГО подхода (N запросов)
        console.log('4️⃣ EXPLAIN ANALYZE - Старый подход (N запросов):\n');

        console.log('SQL для ОДНОЙ позиции:');
        const oldQuery = `
      EXPLAIN ANALYZE
      SELECT 
        eim.id,
        eim.quantity,
        eim.unit_price,
        m.id as material_id,
        m.name as material_name
      FROM estimate_item_materials eim
      JOIN materials m ON eim.material_id = m.id
      WHERE eim.estimate_item_id = $1
      ORDER BY m.name
    `;

        const oldExplain = await pool.query(oldQuery, [itemIds[0]]);
        console.log('\n📊 План выполнения:');
        for (const row of oldExplain.rows) {
            console.log(`   ${row['QUERY PLAN']}`);
        }

        console.log('\n');
        console.log('═══════════════════════════════════════\n');

        // 5. EXPLAIN ANALYZE для НОВОГО подхода (batch запрос ANY)
        console.log('5️⃣ EXPLAIN ANALYZE - Новый подход (batch с ANY):\n');

        console.log(`SQL для ВСЕХ позиций (ANY с ${itemIds.length} элементами):`);
        const newQuery = `
      EXPLAIN ANALYZE
      SELECT 
        eim.id,
        eim.estimate_item_id,
        eim.quantity,
        eim.unit_price,
        m.id as material_id,
        m.name as material_name
      FROM estimate_item_materials eim
      JOIN materials m ON eim.material_id = m.id
      WHERE eim.estimate_item_id = ANY($1)
      ORDER BY eim.estimate_item_id, m.name
    `;

        const newExplain = await pool.query(newQuery, [itemIds]);
        console.log('\n📊 План выполнения:');
        for (const row of newExplain.rows) {
            console.log(`   ${row['QUERY PLAN']}`);
        }

        console.log('\n');
        console.log('═══════════════════════════════════════\n');

        // 6. Бенчмарк реального времени выполнения
        console.log('6️⃣ Бенчмарк времени выполнения:\n');

        // Старый подход
        console.log('⏱️  Старый подход (N запросов):');
        const oldStart = Date.now();

        for (const itemId of itemIds) {
            await pool.query(`
        SELECT 
          eim.id,
          eim.quantity,
          eim.unit_price,
          m.id as material_id,
          m.name as material_name
        FROM estimate_item_materials eim
        JOIN materials m ON eim.material_id = m.id
        WHERE eim.estimate_item_id = $1
      `, [itemId]);
        }

        const oldDuration = Date.now() - oldStart;
        console.log(`   ✓ ${itemIds.length} запросов выполнено за ${oldDuration}ms`);
        console.log(`   ✓ Среднее время на запрос: ${(oldDuration / itemIds.length).toFixed(2)}ms`);

        // Новый подход
        console.log('\n⏱️  Новый подход (batch ANY):');
        const newStart = Date.now();

        await pool.query(`
      SELECT 
        eim.id,
        eim.estimate_item_id,
        eim.quantity,
        eim.unit_price,
        m.id as material_id,
        m.name as material_name
      FROM estimate_item_materials eim
      JOIN materials m ON eim.material_id = m.id
      WHERE eim.estimate_item_id = ANY($1)
    `, [itemIds]);

        const newDuration = Date.now() - newStart;
        console.log(`   ✓ 1 batch запрос выполнен за ${newDuration}ms`);

        console.log('\n');
        console.log('═══════════════════════════════════════\n');

        // 7. Итоговое сравнение
        console.log('7️⃣ ИТОГОВОЕ СРАВНЕНИЕ:\n');

        console.log(`📊 Старый подход:`);
        console.log(`   Запросов: ${itemIds.length}`);
        console.log(`   Время: ${oldDuration}ms`);
        console.log(`   Среднее: ${(oldDuration / itemIds.length).toFixed(2)}ms/запрос`);

        console.log(`\n📊 Новый подход:`);
        console.log(`   Запросов: 1`);
        console.log(`   Время: ${newDuration}ms`);

        const speedup = oldDuration / newDuration;
        console.log(`\n🚀 Результат:`);
        if (speedup > 1) {
            console.log(`   ✅ Новый подход БЫСТРЕЕ в ${speedup.toFixed(2)}x раз`);
        } else {
            console.log(`   ❌ Новый подход МЕДЛЕННЕЕ в ${(1 / speedup).toFixed(2)}x раз`);
        }

        console.log('\n');
        console.log('═══════════════════════════════════════\n');

        // 8. Рекомендации
        console.log('8️⃣ РЕКОМЕНДАЦИИ:\n');

        if (speedup < 1) {
            console.log('⚠️  Batch запрос медленнее. Возможные причины:');
            console.log('   1. Отсутствует индекс на estimate_item_id');
            console.log('   2. PostgreSQL неправильно оптимизирует ANY()');
            console.log('   3. Слишком большой массив параметров');
            console.log('\n💡 Решения:');
            console.log('   - Создать индекс: CREATE INDEX idx_estimate_item_materials_item_id');
            console.log('   - Попробовать WHERE IN вместо ANY');
            console.log('   - Использовать JOIN вместо batch запроса');
        } else {
            console.log('✅ Batch запрос быстрее!');
            console.log('💡 Можно применять оптимизацию');
        }

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Ошибка:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

analyzePerformance();
