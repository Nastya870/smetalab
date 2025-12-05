import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function exportWorks() {
  try {
    console.log('🔍 Подключение к базе данных...');
    
    const result = await pool.query(`
      SELECT 
        code,
        name,
        unit,
        base_price,
        phase,
        section,
        subsection
      FROM works
      ORDER BY phase, section, subsection, code
    `);
    
    console.log(`✅ Загружено ${result.rows.length} работ`);
    
    // Формируем CSV (без категории в экспорте, но видно в комментарии)
    const header = 'Код;Наименование;Ед изм;Базовая цена;Фаза;Раздел;Подраздел';
    const rows = result.rows.map(row => 
      `${row.code || ''};${row.name || ''};${row.unit || ''};${row.base_price || ''};${row.phase || ''};${row.section || ''};${row.subsection || ''}`
    );
    
    const csv = [header, ...rows].join('\n');
    
    const filename = 'Экспорт_работ_БД_' + new Date().toISOString().slice(0,10) + '.csv';
    fs.writeFileSync(filename, '\uFEFF' + csv, 'utf8');
    
    console.log(`\n📁 Файл создан: ${filename}`);
    console.log(`📊 Всего записей: ${result.rows.length}`);
    
    // Статистика по иерархии
    const phases = [...new Set(result.rows.map(r => r.phase).filter(Boolean))];
    const sections = [...new Set(result.rows.map(r => r.section).filter(Boolean))];
    const subsections = [...new Set(result.rows.map(r => r.subsection).filter(Boolean))];
    
    console.log(`\n📈 Статистика:`);
    console.log(`   Уникальных фаз: ${phases.length}`);
    console.log(`   Уникальных разделов: ${sections.length}`);
    console.log(`   Уникальных подразделов: ${subsections.length}`);
    
    // Показываем первые 5 записей
    console.log('\n📋 Первые 5 записей:');
    result.rows.slice(0, 5).forEach((row, i) => {
      console.log(`${i+1}. ${row.code || 'N/A'} - ${row.name}`);
      console.log(`   Иерархия: ${row.phase || 'N/A'} → ${row.section || 'N/A'} → ${row.subsection || 'N/A'}`);
      console.log(`   Цена: ${row.base_price} ${row.unit}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

exportWorks();
