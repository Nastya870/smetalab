import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function fixAllProjectContractNumbers() {
  try {
    console.log('🔍 Поиск проектов без договоров...\n');
    
    // Находим проекты, у которых есть contract_number, но нет записи в таблице contracts
    const projectsWithoutContracts = await pool.query(`
      SELECT p.id, p.name, p.contract_number
      FROM projects p
      LEFT JOIN contracts c ON c.project_id = p.id
      WHERE p.contract_number IS NOT NULL
        AND c.id IS NULL
    `);

    console.log(`📊 Найдено проектов с устаревшими номерами: ${projectsWithoutContracts.rows.length}\n`);

    if (projectsWithoutContracts.rows.length === 0) {
      console.log('✅ Все проекты в порядке!');
      
      // Показываем проекты с договорами
      const projectsWithContracts = await pool.query(`
        SELECT p.id, p.name, p.contract_number, c.contract_number as real_contract_number
        FROM projects p
        INNER JOIN contracts c ON c.project_id = p.id
      `);

      console.log(`\n📄 Проекты с реальными договорами: ${projectsWithContracts.rows.length}`);
      projectsWithContracts.rows.forEach(p => {
        const match = p.contract_number === p.real_contract_number ? '✅' : '❌';
        console.log(`  ${match} ${p.name}: проект="${p.contract_number}" договор="${p.real_contract_number}"`);
      });

      await pool.end();
      process.exit(0);
    }

    // Очищаем устаревшие номера
    console.log('🔧 Очистка устаревших номеров договоров...\n');
    
    for (const project of projectsWithoutContracts.rows) {
      console.log(`  - ${project.name}: "${project.contract_number}" → NULL`);
    }

    await pool.query(`
      UPDATE projects p
      SET contract_number = NULL
      FROM (
        SELECT p.id
        FROM projects p
        LEFT JOIN contracts c ON c.project_id = p.id
        WHERE p.contract_number IS NOT NULL
          AND c.id IS NULL
      ) AS projects_to_update
      WHERE p.id = projects_to_update.id
    `);

    console.log('\n✅ Успешно очищены устаревшие номера договоров!');

    // Синхронизируем номера для проектов с реальными договорами
    console.log('\n🔄 Синхронизация номеров для проектов с договорами...\n');

    const syncResult = await pool.query(`
      UPDATE projects p
      SET contract_number = c.contract_number
      FROM contracts c
      WHERE c.project_id = p.id
        AND (p.contract_number IS NULL OR p.contract_number != c.contract_number)
      RETURNING p.name, p.contract_number
    `);

    if (syncResult.rowCount > 0) {
      console.log(`✅ Обновлено проектов: ${syncResult.rowCount}`);
      syncResult.rows.forEach(p => {
        console.log(`  - ${p.name}: ${p.contract_number}`);
      });
    } else {
      console.log('✅ Все проекты с договорами уже синхронизированы');
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    await pool.end();
    process.exit(1);
  }
}

fixAllProjectContractNumbers();
