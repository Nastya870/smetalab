import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { stringify } from 'csv-stringify/sync';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_z9nkcaAxB6ju@ep-polished-forest-agj7s875-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require';

async function exportToCSV() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

    try {
        console.log('🔌 Подключение к БД...');
        await client.connect();

        // 1. Экспорт категорий (Дерево)
        console.log('📦 Экспорт категорий...');
        const categoriesQuery = `
      WITH RECURSIVE category_tree AS (
        -- Root categories
        SELECT id, name, parent_id, id::text as path_ids, name::text as path_names, 0 as level
        FROM categories 
        WHERE parent_id IS NULL
        
        UNION ALL
        
        -- Children
        SELECT c.id, c.name, c.parent_id, 
               ct.path_ids || '/' || c.id, 
               ct.path_names || '/' || c.name,
               ct.level + 1
        FROM categories c
        JOIN category_tree ct ON c.parent_id = ct.id
      )
      SELECT * FROM category_tree ORDER BY path_names;
    `;
        const categoriesResult = await client.query(categoriesQuery);

        const categoriesCsv = stringify(categoriesResult.rows, {
            header: true,
            columns: ['id', 'name', 'parent_id', 'level', 'path_names', 'path_ids']
        });

        fs.writeFileSync(path.join(__dirname, '../db-export/categories_tree.csv'), categoriesCsv);
        console.log(`✅ Сохранено ${categoriesResult.rows.length} категорий в db-export/categories_tree.csv`);


        // 2. Экспорт работ (с привязкой к категориям)
        console.log('🛠 Экспорт работ...');
        const worksQuery = `
      SELECT 
        w.id, 
        w.code, 
        w.name, 
        w.unit, 
        w.base_price, 
        w.category_id,
        c.name as category_name,
        w.is_global,
        w.tenant_id
      FROM works w
      LEFT JOIN categories c ON w.category_id = c.id
      ORDER BY w.name;
    `;
        const worksResult = await client.query(worksQuery);

        const worksCsv = stringify(worksResult.rows, {
            header: true
        });

        fs.writeFileSync(path.join(__dirname, '../db-export/works_linked.csv'), worksCsv);
        console.log(`✅ Сохранено ${worksResult.rows.length} работ в db-export/works_linked.csv`);

        console.log('\n🎉 Экспорт завершен успешно!');

    } catch (err) {
        console.error('❌ Ошибка:', err);
    } finally {
        await client.end();
    }
}

exportToCSV();
