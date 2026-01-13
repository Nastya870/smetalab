
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

async function resetPassword(email, newPassword) {
    try {
        console.log(`Resetting password for ${email} to ${newPassword}...`);
        const hash = await bcrypt.hash(newPassword, 10);
        const res = await pool.query(
            'UPDATE users SET pass_hash = $1 WHERE email = $2 RETURNING id',
            [hash, email]
        );

        if (res.rows.length === 0) {
            console.log('❌ User not found');
        } else {
            console.log('✅ Password reset successfully!');
        }
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await pool.end();
    }
}

resetPassword('admin@smetka.ru', 'Admin123!');
