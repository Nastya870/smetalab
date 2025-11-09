import pkg from 'pg';
const { Pool } = pkg;

// Подключение к базе данных
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_z9nkcaAxB6ju@ep-polished-forest-agj7s875-pooler.c-2.eu-central-1.aws.neon.tech/neondb',
  ssl: {
    require: true,
    rejectUnauthorized: false
  }
});

// Демо-данные для справочника работ
const initialWorks = [
  {
    code: '01-001',
    name: 'Разработка грунта экскаватором',
    category: 'Земляные работы',
    unit: 'м³',
    basePrice: 450.00
  },
  {
    code: '01-002',
    name: 'Планировка площадей бульдозером',
    category: 'Земляные работы',
    unit: 'м²',
    basePrice: 35.50
  },
  {
    code: '02-001',
    name: 'Устройство бетонной подготовки',
    category: 'Бетонные работы',
    unit: 'м³',
    basePrice: 3200.00
  },
  {
    code: '02-002',
    name: 'Устройство монолитных фундаментов',
    category: 'Бетонные работы',
    unit: 'м³',
    basePrice: 5800.00
  },
  {
    code: '03-001',
    name: 'Кладка стен из кирпича',
    category: 'Кирпичная кладка',
    unit: 'м³',
    basePrice: 4500.00
  },
  {
    code: '04-001',
    name: 'Штукатурка внутренних стен',
    category: 'Отделочные работы',
    unit: 'м²',
    basePrice: 380.00
  },
  {
    code: '04-002',
    name: 'Облицовка стен керамической плиткой',
    category: 'Отделочные работы',
    unit: 'м²',
    basePrice: 850.00
  },
  {
    code: '04-003',
    name: 'Окраска стен водоэмульсионной краской',
    category: 'Отделочные работы',
    unit: 'м²',
    basePrice: 120.00
  },
  {
    code: '05-001',
    name: 'Устройство кровли из металлочерепицы',
    category: 'Кровельные работы',
    unit: 'м²',
    basePrice: 650.00
  },
  {
    code: '06-001',
    name: 'Монтаж окон ПВХ',
    category: 'Прочие',
    unit: 'шт',
    basePrice: 2500.00
  }
];

async function seedWorksData() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Начало заполнения таблицы works демо-данными...\n');
    
    // Проверяем, есть ли уже данные в таблице
    const checkData = await client.query('SELECT COUNT(*) FROM works');
    const count = parseInt(checkData.rows[0].count);
    
    if (count > 0) {
      console.log(`⚠️  В таблице уже есть ${count} записей.`);
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      // В скриптах лучше автоматически очищать для повторных запусков
      console.log('🗑️  Очищаю таблицу для свежих данных...\n');
      await client.query('TRUNCATE TABLE works RESTART IDENTITY CASCADE');
    }
    
    // Начинаем транзакцию
    await client.query('BEGIN');
    
    console.log('📝 Вставка данных...\n');
    
    let insertedCount = 0;
    
    for (const work of initialWorks) {
      const result = await client.query(
        `INSERT INTO works (code, name, category, unit, base_price)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, code, name, base_price`,
        [work.code, work.name, work.category, work.unit, work.basePrice]
      );
      
      insertedCount++;
      const inserted = result.rows[0];
      console.log(`✅ [${insertedCount}/${initialWorks.length}] ${inserted.code} - ${inserted.name} (${inserted.base_price} руб.)`);
    }
    
    // Коммитим транзакцию
    await client.query('COMMIT');
    
    console.log(`\n✅ Успешно добавлено ${insertedCount} записей в таблицу works!`);
    
    // Выводим статистику
    const stats = await client.query(`
      SELECT 
        category,
        COUNT(*) as count,
        MIN(base_price) as min_price,
        MAX(base_price) as max_price,
        AVG(base_price)::numeric(10,2) as avg_price
      FROM works
      GROUP BY category
      ORDER BY category
    `);
    
    console.log('\n📊 Статистика по категориям:');
    console.table(stats.rows);
    
    // Выводим общую статистику
    const totalStats = await client.query(`
      SELECT 
        COUNT(*) as total_works,
        MIN(base_price) as min_price,
        MAX(base_price) as max_price,
        AVG(base_price)::numeric(10,2) as avg_price,
        SUM(base_price)::numeric(10,2) as sum_price
      FROM works
    `);
    
    console.log('\n📈 Общая статистика:');
    console.table(totalStats.rows);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка заполнения данных:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Запуск seed
seedWorksData()
  .then(() => {
    console.log('\n🎉 Заполнение базы данных завершено успешно!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Заполнение завершилось с ошибкой:', error);
    process.exit(1);
  });
