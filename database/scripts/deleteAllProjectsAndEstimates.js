// ============================================================================
// Скрипт для удаления всех проектов и смет из базы данных Neon
// Дата: 15 октября 2025 г.
// ============================================================================

import pkg from 'pg';
const { Client } = pkg;

// Строка подключения к Neon
const connectionString = 'postgresql://neondb_owner:npg_z9nkcaAxB6ju@ep-polished-forest-agj7s875-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require';

async function deleteAllProjectsAndEstimates() {
  const client = new Client({ connectionString });
  
  try {
    console.log('🔌 Подключение к базе данных Neon...\n');
    await client.connect();
    console.log('✅ Подключено успешно!\n');

    // ========================================================================
    // 1. СТАТИСТИКА ПЕРЕД УДАЛЕНИЕМ
    // ========================================================================
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  📊 СТАТИСТИКА ПЕРЕД УДАЛЕНИЕМ                             ║');
    console.log('╠════════════════════════════════════════════════════════════╣');

    const statsBefore = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM projects) as projects_count,
        (SELECT COUNT(*) FROM estimates) as estimates_count,
        (SELECT COUNT(*) FROM estimate_items) as estimate_items_count,
        (SELECT COUNT(*) FROM project_team_members) as team_members_count
    `);
    
    const before = statsBefore.rows[0];
    console.log(`║  Проектов:                        ${String(before.projects_count).padStart(8, ' ')} записей              ║`);
    console.log(`║  Участников команд проектов:      ${String(before.team_members_count).padStart(8, ' ')} записей              ║`);
    console.log(`║  Смет:                            ${String(before.estimates_count).padStart(8, ' ')} записей              ║`);
    console.log(`║  Позиций смет:                    ${String(before.estimate_items_count).padStart(8, ' ')} записей              ║`);
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Показываем детали по компаниям
    console.log('📋 Детализация по компаниям:\n');
    const tenantStats = await client.query(`
      SELECT 
        t.name as company,
        COUNT(DISTINCT p.id) as projects,
        COUNT(DISTINCT e.id) as estimates
      FROM tenants t
      LEFT JOIN projects p ON p.tenant_id = t.id
      LEFT JOIN estimates e ON e.tenant_id = t.id
      GROUP BY t.id, t.name
      ORDER BY t.name
    `);
    
    tenantStats.rows.forEach(row => {
      console.log(`  • ${row.company}: ${row.projects} проектов, ${row.estimates} смет`);
    });
    console.log('');

    // ========================================================================
    // 2. УДАЛЕНИЕ ДАННЫХ
    // ========================================================================
    console.log('🗑️  Начинаем удаление данных...\n');

    // Шаг 1: Проверяем существование таблицы estimate_item_materials
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'estimate_item_materials'
      ) as exists
    `);

    let deletedMaterials = 0;
    if (checkTable.rows[0].exists) {
      const result1 = await client.query('DELETE FROM estimate_item_materials');
      deletedMaterials = result1.rowCount;
      console.log(`  ✅ Удалено материалов из позиций смет: ${deletedMaterials} записей`);
    }

    // Шаг 2: Удаляем позиции смет
    const result2 = await client.query('DELETE FROM estimate_items');
    console.log(`  ✅ Удалено позиций смет: ${result2.rowCount} записей`);

    // Шаг 3: Удаляем сметы
    const result3 = await client.query('DELETE FROM estimates');
    console.log(`  ✅ Удалено смет: ${result3.rowCount} записей`);

    // Шаг 4: Удаляем участников команд проектов
    const result4 = await client.query('DELETE FROM project_team_members');
    console.log(`  ✅ Удалено участников команд: ${result4.rowCount} записей`);

    // Шаг 5: Удаляем проекты
    const result5 = await client.query('DELETE FROM projects');
    console.log(`  ✅ Удалено проектов: ${result5.rowCount} записей`);

    console.log('\n✅ Удаление завершено!\n');

    // ========================================================================
    // 3. СТАТИСТИКА ПОСЛЕ УДАЛЕНИЯ
    // ========================================================================
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  📊 СТАТИСТИКА ПОСЛЕ УДАЛЕНИЯ                              ║');
    console.log('╠════════════════════════════════════════════════════════════╣');

    const statsAfter = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM projects) as projects_count,
        (SELECT COUNT(*) FROM estimates) as estimates_count,
        (SELECT COUNT(*) FROM estimate_items) as estimate_items_count,
        (SELECT COUNT(*) FROM project_team_members) as team_members_count
    `);
    
    const after = statsAfter.rows[0];
    console.log(`║  Проектов:                        ${String(after.projects_count).padStart(8, ' ')} записей              ║`);
    console.log(`║  Участников команд проектов:      ${String(after.team_members_count).padStart(8, ' ')} записей              ║`);
    console.log(`║  Смет:                            ${String(after.estimates_count).padStart(8, ' ')} записей              ║`);
    console.log(`║  Позиций смет:                    ${String(after.estimate_items_count).padStart(8, ' ')} записей              ║`);
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Проверка успешности
    if (after.projects_count === '0' && after.estimates_count === '0' && 
        after.estimate_items_count === '0' && after.team_members_count === '0') {
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║  🎯 ОПЕРАЦИЯ ЗАВЕРШЕНА УСПЕШНО                             ║');
      console.log('╠════════════════════════════════════════════════════════════╣');
      console.log('║  • Все проекты удалены                                     ║');
      console.log('║  • Все сметы удалены                                       ║');
      console.log('║  • Все позиции смет удалены                                ║');
      console.log('║  • Все участники команд удалены                            ║');
      console.log('║                                                            ║');
      console.log('║  База данных готова для новых проектов!                    ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
    } else {
      console.log('⚠️  Некоторые записи могли остаться из-за ограничений прав доступа');
    }

  } catch (error) {
    console.error('❌ Ошибка при выполнении операции:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Отключено от базы данных');
  }
}

// Запускаем скрипт
deleteAllProjectsAndEstimates();
