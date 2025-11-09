import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function fixContractNumber() {
  try {
    console.log('🔍 Поиск проекта "Офис"...\n');
    
    // Находим проект
    const projectResult = await pool.query(`
      SELECT id, name, contract_number 
      FROM projects 
      WHERE name LIKE '%Офис%'
      LIMIT 1
    `);

    if (projectResult.rows.length === 0) {
      console.log('❌ Проект "Офис" не найден');
      await pool.end();
      process.exit(1);
    }

    const project = projectResult.rows[0];
    console.log('📊 Проект найден:');
    console.log(`  ID: ${project.id}`);
    console.log(`  Название: ${project.name}`);
    console.log(`  Текущий номер договора: ${project.contract_number}\n`);

    // Находим договор для этого проекта
    const contractResult = await pool.query(`
      SELECT id, contract_number, project_id
      FROM contracts
      WHERE project_id = $1
      LIMIT 1
    `, [project.id]);

    if (contractResult.rows.length === 0) {
      console.log('⚠️ Договор для проекта не найден в таблице contracts');
      await pool.end();
      process.exit(0);
    }

    const contract = contractResult.rows[0];
    console.log('📄 Договор найден в таблице contracts:');
    console.log(`  ID: ${contract.id}`);
    console.log(`  Номер договора: ${contract.contract_number}\n`);

    if (project.contract_number === contract.contract_number) {
      console.log('✅ Номера договоров уже совпадают, обновление не требуется');
      await pool.end();
      process.exit(0);
    }

    // Обновляем номер в проекте
    console.log('🔧 Обновляю номер договора в проекте...');
    await pool.query(`
      UPDATE projects 
      SET contract_number = $1 
      WHERE id = $2
    `, [contract.contract_number, project.id]);

    console.log(`✅ Успешно обновлено!`);
    console.log(`  Старый номер: ${project.contract_number}`);
    console.log(`  Новый номер: ${contract.contract_number}`);

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    await pool.end();
    process.exit(1);
  }
}

fixContractNumber();
