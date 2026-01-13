import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function checkSuppliersTable() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    console.log('=== ПРОВЕРКА ТАБЛИЦЫ suppliers ===\n');

    // Структура
    const cols = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'suppliers'
    ORDER BY ordinal_position
  `);

    console.log('Структура:');
    cols.rows.forEach(c => {
        console.log(' ', c.column_name.padEnd(20), c.data_type.padEnd(25), c.is_nullable === 'NO' ? 'NOT NULL' : 'NULL');
    });

    // RLS
    const rls = await client.query(`SELECT polname FROM pg_policies WHERE tablename = 'suppliers'`);
    console.log('\nRLS политики:', rls.rows.length > 0 ? rls.rows.map(r => r.polname).join(', ') : 'НЕТ');

    // Индексы
    const idx = await client.query(`SELECT indexname FROM pg_indexes WHERE tablename = 'suppliers'`);
    console.log('Индексы:', idx.rows.length > 0 ? idx.rows.map(r => r.indexname).join(', ') : 'НЕТ');

    // FK
    const fk = await client.query(`
    SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.table_name = 'suppliers' AND tc.constraint_type = 'FOREIGN KEY'
  `);
    console.log('Foreign Keys:', fk.rows.length > 0 ? fk.rows.map(r => `${r.column_name} -> ${r.foreign_table_name}`).join(', ') : 'НЕТ');

    await client.end();
}

checkSuppliersTable().catch(console.error);
