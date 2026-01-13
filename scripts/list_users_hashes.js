
import dotenv from 'dotenv';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function listUsers() {
    try {
        const res = await pool.query('SELECT email, full_name, pass_hash FROM users LIMIT 10');
        console.log('Top 10 users:');
        res.rows.forEach(u => {
            console.log(`- ${u.email} (${u.full_name}): ${u.pass_hash}`);
        });
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await pool.end();
    }
}

listUsers();
