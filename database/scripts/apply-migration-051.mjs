import pkg from 'pg';
const { Client } = pkg;
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Загружаем .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function applyMigration() {
  try {
    console.log('🔄 Подключение к базе данных...');
    await client.connect();
    console.log('✅ Подключено к БД');

    console.log('\n📝 Читаем миграцию 051...');
    const migrationPath = join(__dirname, '..', 'migrations', '051_add_ui_visibility_to_permissions.sql');
    const sql = await fs.readFile(migrationPath, 'utf-8');

    console.log('🚀 Применяем миграцию 051: UI Visibility для разрешений...\n');
    await client.query(sql);

    console.log('\n✅ Миграция 051 успешно применена!');
    console.log('\n📊 Проверяем результат...');

    // Проверяем добавленные колонки
    const checkColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'permissions' AND column_name = 'is_hidden'
      UNION ALL
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'role_permissions' AND column_name = 'is_hidden'
    `);

    console.log('\n✅ Добавленные колонки:');
    checkColumns.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });

    // Проверяем новые разрешения для UI
    const checkPermissions = await client.query(`
      SELECT key, name, resource, action
      FROM permissions
      WHERE action IN ('view', 'view_menu')
      ORDER BY resource
    `);

    console.log(`\n✅ UI разрешения (${checkPermissions.rows.length}):`);
    checkPermissions.rows.forEach(row => {
      console.log(`   - ${row.resource}.${row.action}: ${row.name}`);
    });

    // Проверяем функцию
    const checkFunction = await client.query(`
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_name = 'check_ui_visibility'
    `);

    console.log(`\n✅ Создана функция: ${checkFunction.rows[0]?.routine_name || 'Не найдена'}`);

    // Проверяем представление
    const checkView = await client.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_name = 'v_user_visible_menu'
    `);

    console.log(`✅ Создано представление: ${checkView.rows[0]?.table_name || 'Не найдено'}`);

    // Проверяем назначения для ролей
    const checkRolePermissions = await client.query(`
      SELECT r.key as role, COUNT(*) as permissions_count,
             SUM(CASE WHEN rp.is_hidden = TRUE THEN 1 ELSE 0 END) as hidden_count
      FROM roles r
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE p.action IN ('view', 'view_menu')
      GROUP BY r.key
      ORDER BY r.key
    `);

    console.log(`\n✅ Назначения UI разрешений по ролям:`);
    checkRolePermissions.rows.forEach(row => {
      console.log(`   - ${row.role}: ${row.permissions_count} разрешений (${row.hidden_count} скрыто)`);
    });

    console.log('\n🎉 Миграция завершена успешно!\n');

  } catch (error) {
    console.error('\n❌ Ошибка при применении миграции:', error);
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Соединение с БД закрыто');
  }
}

// Запускаем миграцию
applyMigration()
  .then(() => {
    console.log('\n✅ Скрипт выполнен успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Ошибка выполнения скрипта:', error);
    process.exit(1);
  });
