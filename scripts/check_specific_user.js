
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

async function checkUser(email) {
    try {
        const res = await pool.query(`
      SELECT u.id, u.email, u.full_name, r.key as role_key
      FROM users u
      LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
      LEFT JOIN roles r ON ura.role_id = r.id
      WHERE LOWER(u.email) = LOWER($1)
    `, [email]);

        if (res.rows.length === 0) {
            console.log(`❌ User ${email} not found.`);
        } else {
            console.log(`✅ Found User ${email}:`);
            res.rows.forEach(user => {
                console.log(`- Name: ${user.full_name}, Role: ${user.role_key || 'No Role'}`);
            });
        }
    } catch (err) {
        console.error('❌ Error checking user:', err);
    } finally {
        await pool.end();
    }
}

checkUser('admin@smetalab.com');
