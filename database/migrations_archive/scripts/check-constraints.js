import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://neondb_owner:npg_z9nkcaAxB6ju@ep-polished-forest-agj7s875-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require';

async function checkConstraints() {
  const client = new Client({ connectionString });

  try {
    await client.connect();

    // Проверяем constraint для source_type
    const result = await client.query(`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conname = 'estimate_items_source_type_check'
    `);

    console.log('\n📋 Constraint estimate_items_source_type_check:');
    if (result.rows.length > 0) {
      console.log(result.rows[0].definition);
    } else {
      console.log('Constraint не найден');
    }

    // Проверяем все check constraints для estimate_items
    const allConstraints = await client.query(`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'estimate_items'::regclass
        AND contype = 'c'
    `);

    console.log('\n📋 Все CHECK constraints для estimate_items:');
    allConstraints.rows.forEach(r => {
      console.log(`\n${r.constraint_name}:`);
      console.log(`  ${r.definition}`);
    });

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await client.end();
  }
}

checkConstraints();
