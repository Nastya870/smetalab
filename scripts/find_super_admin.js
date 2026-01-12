
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

async function findSuperAdmin() {
    try {
        const res = await pool.query(`
      SELECT u.id, u.email, u.full_name, r.key as role_key
      FROM users u
      JOIN user_role_assignments ura ON u.id = ura.user_id
      JOIN roles r ON ura.role_id = r.id
      WHERE r.key = 'super_admin'
    `);

        if (res.rows.length === 0) {
            console.log('❌ No Super Admin found in the database.');
        } else {
            console.log('✅ Found Super Admin(s):');
            res.rows.forEach(user => {
                console.log(`- Name: ${user.full_name}, Email: ${user.email}, Role: ${user.role_key}`);
            });
        }
    } catch (err) {
        console.error('❌ Error finding Super Admin:', err);
    } finally {
        await pool.end();
    }
}

findSuperAdmin();
