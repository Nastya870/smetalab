import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://neondb_owner:npg_z9nkcaAxB6ju@ep-polished-forest-agj7s875-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require';

async function clearDatabase() {
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Подключено к базе данных Neon');

    // Получаем список всех таблиц в схеме public
    const result = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);

    const tables = result.rows;
    console.log(`\n📋 Найдено таблиц: ${tables.length}`);

    if (tables.length === 0) {
      console.log('✨ База данных уже пуста!');
      return;
    }

    // Выводим список таблиц
    console.log('\n📊 Таблицы для удаления:');
    tables.forEach((table, index) => {
      console.log(`  ${index + 1}. ${table.tablename}`);
    });

    // Удаляем все таблицы с CASCADE
    console.log('\n🗑️  Удаление таблиц...');
    for (const table of tables) {
      await client.query(`DROP TABLE IF EXISTS "${table.tablename}" CASCADE`);
      console.log(`  ✓ Удалена таблица: ${table.tablename}`);
    }

    // Проверяем, что все таблицы удалены
    const checkResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);

    console.log(`\n✨ Готово! Осталось таблиц: ${checkResult.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    throw error;
  } finally {
    await client.end();
    console.log('\n🔌 Соединение закрыто');
  }
}

// Запускаем функцию
clearDatabase()
  .then(() => {
    console.log('\n🎉 База данных успешно очищена!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Не удалось очистить базу данных:', error);
    process.exit(1);
  });
