
import pg from 'pg';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
});

async function run() {
    const client = await pool.connect();
    try {
        console.log('Connected to DB');

        const res = await client.query(`
      SELECT id, name, parent_id, type, tenant_id, is_global 
      FROM categories 
      WHERE type = 'material'
      ORDER BY created_at DESC
      LIMIT 50;
    `);

        console.log('Categories (type=material):');
        console.table(res.rows);

        const resMat = await client.query(`
        SELECT 
            c.name as category_name, 
            count(m.id) as material_count 
        FROM materials m
        LEFT JOIN categories c ON m.category_id = c.id
        GROUP BY c.name
        ORDER BY count(m.id) DESC
        LIMIT 20;
    `);
        console.log('\nMaterials count by category:');
        console.table(resMat.rows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
