import dotenv from 'dotenv';
import pg from 'pg';
import fs from 'fs';
import Papa from 'papaparse';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Загружаем .env из директории vite
dotenv.config({ path: join(__dirname, '.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Получаем данные пользователя из БД по email
const ADMIN_EMAIL = 'kiy026@yandex.ru';

async function importWorksToTenant() {
  // Получаем данные администратора (user_id + tenant_id через user_tenants)
  const userResult = await pool.query(`
    SELECT u.id as user_id, ut.tenant_id
    FROM users u
    JOIN user_tenants ut ON u.id = ut.user_id
    WHERE u.email = $1 AND ut.is_default = TRUE
  `, [ADMIN_EMAIL]);
  
  if (userResult.rows.length === 0) {
    throw new Error(`Пользователь с email ${ADMIN_EMAIL} не найден или у него нет дефолтного тенанта`);
  }
  
  const { user_id: USER_ID, tenant_id: TENANT_ID } = userResult.rows[0];
  
  console.log('👤 Администратор для импорта:');
  console.log(`   Email: ${ADMIN_EMAIL}`);
  console.log(`   User ID: ${USER_ID}`);
  console.log(`   Tenant ID: ${TENANT_ID}\n`);
  try {
    console.log('📥 Импорт работ в ТЕНАНТНЫЙ справочник\n');
    
    // Читаем CSV файл из корневой директории проекта
    const csvPath = join(__dirname, '..', 'Шаблон_импорта_работ (1).csv');
    const csvFile = fs.readFileSync(csvPath, 'utf8');
    
    // Парсим CSV
    const parseResult = Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      delimiter: ';' // Ваш файл использует точку с запятой
    });
    
    const rows = parseResult.data;
    console.log(`✅ Загружено строк из CSV: ${rows.length}\n`);
    
    // Фильтруем только валидные записи (раздел и подраздел могут отсутствовать - это нормально!)
    const validWorks = rows.filter(row => {
      const code = row['Код'];
      const name = row['Наименование'];
      // Проверяем только обязательные поля: код и наименование
      return code && name && code.trim() !== '' && name.trim() !== '' && !code.includes('#Н/Д');
    });
    
    console.log(`✅ Валидных записей: ${validWorks.length}\n`);
    
    // Показываем первые 3 записи
    console.log('📋 Первые 3 записи для импорта:');
    validWorks.slice(0, 3).forEach((row, i) => {
      console.log(`${i+1}. ${row['Код']} - ${row['Наименование']}`);
      console.log(`   Цена: ${row['Базовая цена']} ${row['Ед изм']}`);
      const phase = row['Фаза'] || 'н/д';
      const section = row['Раздел'] || 'н/д';
      const subsection = row['Подраздел'] || 'н/д';
      console.log(`   Иерархия: ${phase} → ${section} → ${subsection}`);
    });
    
    console.log('\n❓ Начать импорт? (нажмите Ctrl+C для отмены, Enter для продолжения)');
    
    // Ждем подтверждения (для безопасности)
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
    
    console.log('\n🚀 Начинаем импорт...\n');
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const row of validWorks) {
      try {
        // Раздел и подраздел могут отсутствовать - это нормально!
        const work = {
          code: row['Код'].trim(),
          name: row['Наименование'].trim(),
          unit: (row['Ед изм'] || 'шт').trim(),
          base_price: parseFloat(row['Базовая цена']) || 0,
          phase: row['Фаза'] && row['Фаза'].trim() !== '' ? row['Фаза'].trim() : null,
          section: row['Раздел'] && row['Раздел'].trim() !== '' ? row['Раздел'].trim() : null,
          subsection: row['Подраздел'] && row['Подраздел'].trim() !== '' ? row['Подраздел'].trim() : null,
          is_global: false,            // ТЕНАНТНАЯ работа (не глобальная!)
          tenant_id: TENANT_ID,        // Tenant администратора
          created_by: USER_ID          // ID администратора
        };
        
        // ⚠️ ВАЖНО: Проверяем существование кода ТОЛЬКО в рамках этого тенанта
        // Тенантный справочник независим от глобального!
        const existing = await pool.query(
          'SELECT id FROM works WHERE code = $1 AND tenant_id = $2 AND is_global = FALSE',
          [work.code, TENANT_ID]
        );
        
        if (existing.rows.length > 0) {
          skipped++;
          if (skipped <= 5) {
            console.log(`⏭️  Пропуск: ${work.code} (уже существует)`);
          }
          continue;
        }
        
        // Вставляем работу
        await pool.query(`
          INSERT INTO works (
            code, name, unit, base_price, 
            phase, section, subsection,
            is_global, tenant_id, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          work.code, work.name, work.unit, work.base_price,
          work.phase, work.section, work.subsection,
          work.is_global, work.tenant_id, work.created_by
        ]);
        
        imported++;
        if (imported <= 5) {
          console.log(`✅ Импорт: ${work.code} - ${work.name}`);
        } else if (imported % 50 === 0) {
          console.log(`   ... импортировано ${imported} работ`);
        }
        
      } catch (error) {
        errors++;
        if (errors <= 5) {
          console.error(`❌ Ошибка при импорте ${row['Код']}: ${error.message}`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 ИТОГИ ИМПОРТА:');
    console.log('='.repeat(60));
    console.log(`✅ Успешно импортировано:  ${imported}`);
    console.log(`⏭️  Пропущено (дубликаты): ${skipped}`);
    console.log(`❌ Ошибок:                 ${errors}`);
    console.log(`📝 Всего обработано:       ${validWorks.length}`);
    console.log('='.repeat(60));
    
    // Проверяем результат
    console.log('\n🔍 Проверка тенантных работ в БД:');
    const tenantWorks = await pool.query(`
      SELECT COUNT(*) as count
      FROM works
      WHERE is_global = FALSE AND tenant_id = $1
    `, [TENANT_ID]);
    
    console.log(`Всего тенантных работ в БД: ${tenantWorks.rows[0].count}`);
    
    // Показываем примеры
    const examples = await pool.query(`
      SELECT code, name, phase, section
      FROM works
      WHERE is_global = FALSE AND tenant_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [TENANT_ID]);
    
    console.log('\n📋 Последние импортированные работы:');
    examples.rows.forEach((work, i) => {
      console.log(`${i+1}. ${work.code} - ${work.name}`);
      console.log(`   ${work.phase} → ${work.section}`);
    });
    
    await pool.end();
    console.log('\n✅ Импорт завершен!');
    
  } catch (error) {
    console.error('\n❌ Критическая ошибка:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

importWorksToTenant();
