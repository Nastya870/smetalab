import db from './server/config/database.js';

async function check() {
    try {
        const email = 'admin@smetka.ru';
        const userRes = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0) {
            console.log('User not found');
            process.exit(1);
        }
        const userId = userRes.rows[0].id;

        console.log('User ID:', userId);

        const rolesRes = await db.query(`
      SELECT ura.tenant_id, r.key, r.name 
      FROM user_role_assignments ura 
      JOIN roles r ON r.id = ura.role_id 
      WHERE ura.user_id = $1
    `, [userId]);

        console.log('All roles assigned to user:');
        console.table(rolesRes.rows);

        const tenantsRes = await db.query(`
      SELECT t.id, t.name 
      FROM tenants t 
      JOIN user_tenants ut ON t.id = ut.tenant_id 
      WHERE ut.user_id = $1
    `, [userId]);

        console.log('Tenants user belongs to:');
        console.table(tenantsRes.rows);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
