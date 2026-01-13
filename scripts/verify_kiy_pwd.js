
import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcrypt';
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

async function verifyHash(email) {
    try {
        const res = await pool.query('SELECT email, pass_hash FROM users WHERE email = $1', [email]);
        if (res.rows.length === 0) {
            console.log(`❌ User ${email} not found`);
            return;
        }
        const { pass_hash } = res.rows[0];
        console.log(`User: ${email}`);
        console.log(`Hash: ${pass_hash}`);

        const passwords = ['Admin123!', 'admin', 'Test123!@#', 'Password123!', '12345678', 'admin123'];
        for (const pwd of passwords) {
            const match = await bcrypt.compare(pwd, pass_hash);
            console.log(`Testing "${pwd}": ${match ? '✅ MATCH' : '❌ NO MATCH'}`);
        }
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await pool.end();
    }
}

async function run() {
    await verifyHash('kiy026@yandex.ru');
}

run();
