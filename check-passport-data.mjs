import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkPassportData() {
  try {
    console.log('🔍 Проверка данных паспорта в БД...\n');
    
    const result = await pool.query(`
      SELECT 
        id,
        full_name,
        passport_series_number,
        passport_series,
        passport_number,
        passport_issued_by_code,
        LENGTH(REGEXP_REPLACE(passport_series_number, '[^0-9]', '', 'g')) as digits_count
      FROM counterparties 
      WHERE entity_type = 'individual' 
        AND full_name LIKE '%Кузьмина%'
      LIMIT 5
    `);

    console.log('📊 Найдено записей:', result.rows.length);
    console.log('\n');
    
    result.rows.forEach((row, index) => {
      console.log(`Запись ${index + 1}:`);
      console.log(`  ФИО: ${row.full_name}`);
      console.log(`  Старое поле (passport_series_number): "${row.passport_series_number}"`);
      console.log(`  Количество цифр: ${row.digits_count}`);
      console.log(`  Новые поля:`);
      console.log(`    passport_series: "${row.passport_series}"`);
      console.log(`    passport_number: "${row.passport_number}"`);
      console.log(`    passport_issued_by_code: "${row.passport_issued_by_code}"`);
      console.log('\n');
    });

    // Попробуем обновить вручную
    console.log('🔧 Пробую обновить данные для Кузьминой...');
    
    const updateResult = await pool.query(`
      UPDATE counterparties
      SET 
        passport_series = SUBSTRING(REGEXP_REPLACE(passport_series_number, '[^0-9]', '', 'g'), 1, 4),
        passport_number = SUBSTRING(REGEXP_REPLACE(passport_series_number, '[^0-9]', '', 'g'), 5, 6)
      WHERE 
        entity_type = 'individual' 
        AND full_name LIKE '%Кузьмина%'
        AND passport_series_number IS NOT NULL 
        AND passport_series_number <> ''
      RETURNING *
    `);

    console.log('✅ Обновлено записей:', updateResult.rowCount);
    
    if (updateResult.rowCount > 0) {
      updateResult.rows.forEach((row, index) => {
        console.log(`\nОбновленная запись ${index + 1}:`);
        console.log(`  ФИО: ${row.full_name}`);
        console.log(`  passport_series: "${row.passport_series}"`);
        console.log(`  passport_number: "${row.passport_number}"`);
      });
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    await pool.end();
    process.exit(1);
  }
}

checkPassportData();
