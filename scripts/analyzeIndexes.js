import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function analyzeIndexes() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    console.log('=== АНАЛИЗ ИНДЕКСОВ ===\n');

    // Индексы которые автоматически созданы constraints (PK, UNIQUE)
    const autoIndexes = await client.query(`
    SELECT COUNT(*) as cnt 
    FROM pg_indexes 
    WHERE schemaname = 'public'
    AND indexname IN (
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE constraint_type IN ('PRIMARY KEY', 'UNIQUE')
    )
  `);
    console.log(`Автоиндексы (от PK/UNIQUE): ${autoIndexes.rows[0].cnt}`);

    // Индексы которые созданы вручную (CREATE INDEX)
    const manualIndexes = await client.query(`
    SELECT COUNT(*) as cnt 
    FROM pg_indexes 
    WHERE schemaname = 'public'
    AND indexname NOT IN (
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE constraint_type IN ('PRIMARY KEY', 'UNIQUE')
    )
  `);
    console.log(`Ручные индексы (CREATE INDEX): ${manualIndexes.rows[0].cnt}`);

    // Всего индексов
    const total = await client.query(`
    SELECT COUNT(*) as cnt FROM pg_indexes WHERE schemaname = 'public'
  `);
    console.log(`\nВсего индексов: ${total.rows[0].cnt}`);
    console.log(`  = ${autoIndexes.rows[0].cnt} (авто) + ${manualIndexes.rows[0].cnt} (ручные)`);

    await client.end();
}

analyzeIndexes().catch(console.error);
