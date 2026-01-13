import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Подключение к БД из переменных окружения (ОБЯЗАТЕЛЬНО!)
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Критическая ошибка: DATABASE_URL не установлен!');
  console.error('Установите переменную окружения DATABASE_URL перед запуском миграций.');
  process.exit(1);
}

/**
 * Применяет SQL файл к базе данных
 */
async function applySQLFile(client, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);

  console.log(`\n📄 Применение: ${fileName}`);
  console.log('─'.repeat(60));

  try {
    await client.query(sql);
    console.log(`✅ Успешно применен: ${fileName}`);
    return true;
  } catch (error) {
    // Игнорируем ошибки "already exists" для идемпотентности
    const ignorableErrors = [
      'already exists',
      'duplicate key value',
      'does not exist',
      'could not create unique index',
      'no unique or exclusion constraint matching'
    ];

    const isIgnorable = ignorableErrors.some(msg => error.message.includes(msg));

    if (isIgnorable) {
      console.log(`⚠️  Пропущено (объект уже существует): ${fileName}`);
      return true;
    }

    console.error(`❌ Ошибка в файле ${fileName}:`);
    console.error(error.message);
    return false;
  }
}

/**
 * Главная функция миграции
 */
async function runMigrations() {
  // Определяем, нужно ли SSL (для localhost отключаем)
  const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

  const client = new Client({
    connectionString,
    ssl: isLocalhost ? false : {
      rejectUnauthorized: false
    }
  });

  try {
    // Подключение к БД
    console.log('\n🔌 Подключение к базе данных...');
    await client.connect();
    await client.query("SET client_encoding = 'UTF8'");
    console.log('✅ Подключение установлено\n');

    // Пути к миграциям и сидам
    const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
    const seedsDir = path.join(__dirname, '..', 'database', 'seeds');

    // Получаем список файлов миграций
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    // Получаем список файлов сидов
    const seedFiles = fs.readdirSync(seedsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log('📋 План выполнения:');
    console.log('═'.repeat(60));
    console.log(`Миграции (${migrationFiles.length}):`);
    migrationFiles.forEach(file => console.log(`  • ${file}`));
    console.log(`\nСиды (${seedFiles.length}):`);
    seedFiles.forEach(file => console.log(`  • ${file}`));
    console.log('═'.repeat(60));

    // Проверяем, пустая ли база (для решения, применять ли baseline)
    const tablesCheck = await client.query(`
      SELECT COUNT(*) as cnt FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    const isEmptyDb = parseInt(tablesCheck.rows[0].cnt) === 0;
    console.log(`\n📊 БД ${isEmptyDb ? 'ПУСТАЯ — применяем baseline' : 'НЕ пустая — пропускаем baseline (001)'}\n`);

    // Применяем миграции
    console.log('🔄 Применение миграций...');
    let successCount = 0;
    let failCount = 0;

    for (const file of migrationFiles) {
      // Пропускаем baseline (001_complete_schema.sql), если БД не пустая
      if (file.startsWith('001_') && !isEmptyDb) {
        console.log(`⏭️  Пропущен (БД не пустая): ${file}`);
        continue;
      }

      const filePath = path.join(migrationsDir, file);
      const success = await applySQLFile(client, filePath);
      if (success) {
        successCount++;
      } else {
        failCount++;
        break; // Останавливаемся при первой ошибке
      }
    }

    // Если миграции прошли успешно, применяем сиды
    if (failCount === 0) {
      console.log('\n🌱 Применение сидов...');

      for (const file of seedFiles) {
        const filePath = path.join(seedsDir, file);
        const success = await applySQLFile(client, filePath);
        if (success) {
          successCount++;
        } else {
          failCount++;
          break;
        }
      }
    }

    // Итоговая статистика
    console.log('\n' + '═'.repeat(60));
    console.log('📊 ИТОГИ:');
    console.log('═'.repeat(60));
    console.log(`✅ Успешно: ${successCount}`);
    console.log(`❌ Ошибок: ${failCount}`);

    if (failCount === 0) {
      console.log('\n🎉 Все миграции успешно применены!');

      // Выводим статистику таблиц
      const tablesResult = await client.query(`
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
      `);

      console.log(`\n📊 Создано таблиц: ${tablesResult.rows.length}`);
      console.log('\nСписок таблиц:');
      tablesResult.rows.forEach((row, index) => {
        console.log(`  ${index + 1}. ${row.tablename}`);
      });

      // Выводим статистику ролей
      const rolesResult = await client.query('SELECT COUNT(*) as count FROM roles');
      const permissionsResult = await client.query('SELECT COUNT(*) as count FROM permissions');

      console.log(`\n👥 Создано ролей: ${rolesResult.rows[0].count}`);
      console.log(`🔐 Создано разрешений: ${permissionsResult.rows[0].count}`);

      // Выводим информацию о тестовом админе
      const adminResult = await client.query(`
        SELECT email, full_name, email_verified 
        FROM users 
        WHERE email = 'admin@smetka.ru'
      `);

      if (adminResult.rows.length > 0) {
        console.log('\n🔑 Тестовый супер-админ создан:');
        console.log(`   Email: ${adminResult.rows[0].email}`);
        console.log(`   Имя: ${adminResult.rows[0].full_name}`);
        console.log(`   Пароль: Admin123! (ОБЯЗАТЕЛЬНО СМЕНИТЕ!)`);
      }
    } else {
      console.log('\n💥 Миграции завершились с ошибками!');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Критическая ошибка:');
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Соединение закрыто\n');
  }
}

// Запуск миграций
console.log('╔═══════════════════════════════════════════════════════╗');
console.log('║     СИСТЕМА МИГРАЦИЙ - СМЕТНОЕ ПРИЛОЖЕНИЕ            ║');
console.log('╚═══════════════════════════════════════════════════════╝');

runMigrations().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
