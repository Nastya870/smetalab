import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const NEON_URL = process.env.DATABASE_URL_NEON || process.env.DATABASE_URL;
const RENDER_URL = process.env.RENDER_DATABASE_URL;

if (!NEON_URL || !RENDER_URL) {
  console.error('❌ Ошибка: DATABASE_URL_NEON и RENDER_DATABASE_URL должны быть установлены в .env');
  process.exit(1);
}

console.log('\n🔄 МИГРАЦИЯ ДАННЫХ: Neon → Render PostgreSQL\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Таблицы в порядке миграции (с учетом foreign keys)
const TABLES = [
  'tenants',
  'users',
  'user_tenants',
  'roles',
  'permissions',
  'role_permissions',
  'user_role_assignments',
  'sessions',
  'email_verifications',
  'email_verification_tokens',
  'password_resets',
  'projects',
  'project_team_members',
  'contracts',
  'counterparties',
  'works',
  'work_hierarchy',
  'materials',
  'work_materials',
  'estimates',
  'estimate_items',
  'estimate_item_materials',
  'estimate_templates',
  'estimate_template_works',
  'estimate_template_materials',
  'object_parameters',
  'object_openings',
  'schedules',
  'purchases',
  'global_purchases',
  'work_completions',
  'work_completion_acts',
  'work_completion_act_items',
  'act_signatories'
];

async function migrateData() {
  const neonClient = new Client({ 
    connectionString: NEON_URL,
    ssl: { rejectUnauthorized: false }
  });
  const renderClient = new Client({ 
    connectionString: RENDER_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
    query_timeout: 60000,
    keepAlive: true
  });

  try {
    console.log('🔌 Подключение к Neon PostgreSQL...');
    await neonClient.connect();
    console.log('✅ Подключено к Neon\n');

    console.log('🔌 Подключение к Render PostgreSQL...');
    await renderClient.connect();
    console.log('✅ Подключено к Render\n');

    const stats = {
      total: 0,
      success: 0,
      failed: 0,
      skipped: 0
    };

    const { rows: renderTables } = await renderClient.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log(`✅ Найдено ${renderTables.length} таблиц в Render\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // ОЧИСТКА RENDER БД
    console.log('🗑️  ОЧИСТКА ВСЕХ ДАННЫХ В RENDER БД...\n');
    
    // Удаляем данные в обратном порядке (учитывая FK)
    for (const table of [...TABLES].reverse()) {
      try {
        const { rows: checkTable } = await renderClient.query(`
          SELECT EXISTS (
            SELECT FROM pg_tables 
            WHERE schemaname = 'public' AND tablename = $1
          )
        `, [table]);

        if (checkTable[0].exists) {
          await renderClient.query(`DELETE FROM "${table}"`);
          console.log(`   ✅ ${table}: очищена`);
        }
      } catch (error) {
        console.log(`   ⚠️  ${table}: ${error.message}`);
      }
    }

    console.log('\n✅ Все данные удалены! Начинаем копирование...\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Копирование данных
    for (const table of TABLES) {
      try {
        stats.total++;
        
        const { rows: neonCheck } = await neonClient.query(`
          SELECT EXISTS (
            SELECT FROM pg_tables 
            WHERE schemaname = 'public' AND tablename = $1
          )
        `, [table]);

        if (!neonCheck[0].exists) {
          console.log(`⏭️  ${table}: не существует в Neon, пропускаем`);
          stats.skipped++;
          continue;
        }

        const { rows: countRows } = await neonClient.query(`SELECT COUNT(*) FROM "${table}"`);
        const count = parseInt(countRows[0].count);

        if (count === 0) {
          console.log(`⏭️  ${table}: таблица пустая, пропускаем`);
          stats.skipped++;
          continue;
        }

        console.log(`📦 ${table}: копирование ${count} записей...`);

        const { rows: data } = await neonClient.query(`SELECT * FROM "${table}"`);

        if (data.length === 0) {
          console.log(`   ✅ ${table}: нет данных\n`);
          stats.success++;
          continue;
        }

        const columns = Object.keys(data[0]);
        const columnNames = columns.map(c => `"${c}"`).join(', ');

        // Батч-вставка по 250 записей
        const BATCH_SIZE = 250;
        let inserted = 0;
        
        for (let i = 0; i < data.length; i += BATCH_SIZE) {
          const batch = data.slice(i, i + BATCH_SIZE);
          const values = [];
          const placeholders = [];
          
          batch.forEach((row, rowIndex) => {
            const rowPlaceholders = columns.map((_, colIndex) => {
              const paramIndex = rowIndex * columns.length + colIndex + 1;
              return `$${paramIndex}`;
            }).join(', ');
            
            placeholders.push(`(${rowPlaceholders})`);
            columns.forEach(col => values.push(row[col]));
          });
          
          await renderClient.query(
            `INSERT INTO "${table}" (${columnNames}) VALUES ${placeholders.join(', ')}`,
            values
          );
          
          inserted += batch.length;
          if (data.length > 500) {
            process.stdout.write(`\r   📊 ${table}: ${inserted}/${count} (${Math.round(inserted/count*100)}%)`);
          }
        }

        if (data.length > 500) console.log(''); // Новая строка после прогресс-бара
        console.log(`   ✅ ${table}: скопировано ${inserted}/${count} записей\n`);
        stats.success++;

      } catch (error) {
        console.error(`   ❌ ${table}: ОШИБКА - ${error.message}\n`);
        stats.failed++;
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 РЕЗУЛЬТАТЫ МИГРАЦИИ:\n');
    console.log(`   Всего таблиц:     ${stats.total}`);
    console.log(`   ✅ Успешно:       ${stats.success}`);
    console.log(`   ⏭️  Пропущено:     ${stats.skipped}`);
    console.log(`   ❌ Ошибки:        ${stats.failed}`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (stats.failed === 0) {
      console.log('🎉 МИГРАЦИЯ ЗАВЕРШЕНА УСПЕШНО!\n');
    } else {
      console.log('⚠️  МИГРАЦИЯ ЗАВЕРШЕНА С ОШИБКАМИ\n');
    }

  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await neonClient.end();
    await renderClient.end();
  }
}

migrateData();
