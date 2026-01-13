import pkg from 'pg';
const { Client } = pkg;
import jwt from 'jsonwebtoken';

const connectionString = process.env.DATABASE_URL ||
    'postgresql://neondb_owner:npg_z9nkcaAxB6ju@ep-polished-forest-agj7s875-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require';

async function debugViewerPermissions() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('🔌 Connected to DB');

        // 1. Check Viewer Role Permissions
        console.log('🔍 Checking Viewer Role Permissions...');
        const res = await client.query(`
        SELECT r.key as role_key, p.key as permission_key
        FROM roles r
        JOIN role_permissions rp ON r.id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE r.key = 'viewer' AND r.tenant_id IS NULL
    `);

        console.log('Viewer Permissions (Global):');
        res.rows.forEach(row => console.log(` - ${row.permission_key}`));

        const hasCreate = res.rows.some(r => r.permission_key === 'projects.create');
        if (hasCreate) {
            console.error('❌ CRITICAL: Viewer role has projects.create permission!');
        } else {
            console.log('✅ Viewer role does NOT have projects.create permission.');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.end();
    }
}

debugViewerPermissions();
