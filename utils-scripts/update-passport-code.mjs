import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function updatePassportCode() {
  try {
    console.log('🔄 Обновление кода подразделения для Кузьминой Светланы Александровны...\n');

    // Обновляем код подразделения
    await pool.query(`
      UPDATE counterparties 
      SET passport_issued_by_code = '770-045'
      WHERE full_name = 'Кузьмина Светлана Александровна'
    `);

    // Проверяем результат
    const result = await pool.query(`
      SELECT 
        full_name,
        passport_series,
        passport_number,
        passport_issued_by_code,
        passport_issued_by
      FROM counterparties 
      WHERE full_name = 'Кузьмина Светлана Александровна'
    `);

    if (result.rows.length > 0) {
      const customer = result.rows[0];
      console.log('✅ Код подразделения успешно добавлен:\n');
      console.log(`   ФИО: ${customer.full_name}`);
      console.log(`   Паспорт серия: ${customer.passport_series}`);
      console.log(`   Паспорт номер: ${customer.passport_number}`);
      console.log(`   Код подразделения: ${customer.passport_issued_by_code}`);
      console.log(`   Выдан: ${customer.passport_issued_by}`);
    } else {
      console.log('❌ Заказчик не найден');
    }

  } catch (error) {
    console.error('❌ Ошибка при обновлении кода подразделения:', error);
  } finally {
    await pool.end();
  }
}

updatePassportCode();
