import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = process.env.DATABASE_URL;

async function syncDb() {
    if (!connectionString) {
        console.error('❌ DATABASE_URL is not set!');
        return;
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connected to DB');

        const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
        const seedsDir = path.join(__dirname, '..', 'database', 'seeds');

        // 1. Apply 060 and 061
        const filesToApply = [
            path.join(migrationsDir, '060_fix_roles_permissions_constraints.sql'),
            path.join(migrationsDir, '061_fix_roles_unique_constraint.sql')
        ];

        for (const file of filesToApply) {
            console.log(`📄 Applying migration: ${path.basename(file)}`);
            const sql = fs.readFileSync(file, 'utf8');
            await client.query(sql);
            console.log(`✅ Applied ${path.basename(file)}`);
        }

        // 2. Apply 002 seed (idempotent)
        console.log('🌱 Applying seed: 002_seed_roles_permissions.sql');
        const seedSql = fs.readFileSync(path.join(seedsDir, '002_seed_roles_permissions.sql'), 'utf8');
        await client.query(seedSql);
        console.log('✅ Seed applied');

        // 3. Verify Global Admin Permissions
        console.log('🔍 Verifying Global Admin permissions...');
        const adminRoleRes = await client.query("SELECT id FROM roles WHERE key = 'admin' AND tenant_id IS NULL");
        if (adminRoleRes.rows.length === 0) {
            throw new Error('Global admin role still missing after seeding!');
        }
        const adminRoleId = adminRoleRes.rows[0].id;

        const permsCountRes = await client.query("SELECT COUNT(*) FROM role_permissions WHERE role_id = $1", [adminRoleId]);
        console.log(`✅ Global Admin has ${permsCountRes.rows[0].count} permissions.`);

        if (parseInt(permsCountRes.rows[0].count) === 0) {
            console.log('⚠️ Global Admin has NO permissions. Fixing...');
            // Add all permissions to global admin
            await client.query(`
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT $1, id FROM permissions
            ON CONFLICT DO NOTHING
        `, [adminRoleId]);
            console.log('✅ Global Admin permissions restored.');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.end();
    }
}

syncDb();
