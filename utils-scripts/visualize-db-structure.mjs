import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;
const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_z9nkcaAxB6ju@ep-polished-forest-agj7s875-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require';

async function visualize() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();

    try {
        console.log('\n🔍 --- 1. КАК БЫЛО (Плоская структура) ---');
        console.log('Каждая работа хранит полный путь текстом. Если переименовать раздел, надо менять 1000 записей.\n');

        const oldWorks = await client.query(`
      SELECT left(name, 30) as name, left(phase, 20) as phase, left(section, 20) as section, left(subsection, 20) as subsection 
      FROM works 
      WHERE subsection != '' AND subsection IS NOT NULL 
      LIMIT 3
    `);

        console.table(oldWorks.rows);

        console.log('\n✨ --- 2. КАК СТАЛО (Древовидная структура) ---');
        console.log('Работы ссылаются только на ID категории. Категории выстроены в дерево.\n');

        // Fetch the same works but via category relations
        const newWorks = await client.query(`
      SELECT 
        left(w.name, 30) as work_name, 
        c3.name as category_level_3,
        c2.name as category_level_2,
        c1.name as category_level_1
      FROM works w
      JOIN categories c3 ON w.category_id = c3.id
      LEFT JOIN categories c2 ON c3.parent_id = c2.id
      LEFT JOIN categories c1 ON c2.parent_id = c1.id
      WHERE w.id IN (SELECT id FROM works WHERE subsection != '' AND subsection IS NOT NULL LIMIT 3)
    `);

        console.table(newWorks.rows);

        console.log('\n📂 --- 3. САМО ДЕРЕВО КАТЕГОРИЙ (Таблица categories) ---');
        console.log('Записи связаны через parent_id. Можно создавать любую глубину вложенности.\n');

        const treeData = await client.query(`
      WITH RECURSIVE tree AS (
        SELECT id, name, parent_id, 0 as level, CAST(name AS text) as path
        FROM categories 
        WHERE parent_id IS NULL AND name IN (SELECT phase FROM works WHERE subsection != '' LIMIT 1)
        UNION ALL
        SELECT c.id, c.name, c.parent_id, t.level + 1, CAST(t.path || ' -> ' || c.name AS text)
        FROM categories c
        JOIN tree t ON c.parent_id = t.id
      )
      SELECT left(id::text, 8) as id, left(parent_id::text, 8) as parent, name, level FROM tree ORDER BY path LIMIT 5;
    `);

        console.table(treeData.rows);

    } finally {
        await client.end();
    }
}

visualize();
