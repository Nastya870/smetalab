import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        const res = await client.query(`
      SELECT schemaname, tablename, indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'materials' AND indexname = 'idx_materials_sku_scope_unique';
    `);
        console.log('Index check:', JSON.stringify(res.rows, null, 2));

        const tables = await client.query(`
       SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public'
    `);
        console.log('Tables:', tables.rows.map(t => t.table_name).join(', '));
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}
check();
