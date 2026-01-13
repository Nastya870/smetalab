import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../server/index.js';
import db from '../../server/config/database.js';

// @vitest-environment node

describe('Permissions Boundary Check', () => {
    const timestamp = Date.now();
    const userEmail = `boundary_${timestamp}@test.com`;
    const userPassword = 'Password123!';
    let accessToken = '';
    let tenantId = '';
    let userId = '';

    afterAll(async () => {
        if (tenantId) {
            await db.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
        }
        await db.pool.end();
    });

    it('should register a new user (admin by default)', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                email: userEmail,
                password: userPassword,
                fullName: 'Boundary Tester',
                companyName: `Boundary Company ${timestamp}`,
                skipEmailVerification: true
            });

        expect(res.status).toBe(201);
        accessToken = res.body.data.tokens.accessToken;
        tenantId = res.body.data.tenant.id;
        userId = res.body.data.user.id;
    });

    it('should verify the user is admin and has permissions', async () => {
        // Check DB directly
        const roleRes = await db.query(`
        SELECT r.key 
        FROM user_role_assignments ura
        JOIN roles r ON r.id = ura.role_id
        WHERE ura.user_id = $1 AND ura.tenant_id = $2
    `, [userId, tenantId]);

        expect(roleRes.rows[0].key).toBe('admin');
    });

    it('should downgrade user to viewer (remove admin role, add viewer)', async () => {
        // 1. Get viewer role id
        const viewerRoleRes = await db.query(`SELECT id, key, tenant_id FROM roles WHERE key = 'viewer' AND tenant_id IS NULL`);
        console.log('DEBUG: Viewer Role Query Result:', viewerRoleRes.rows);

        if (viewerRoleRes.rows.length === 0) {
            throw new Error('Viewer role not found in DB');
        }

        const viewerRoleId = viewerRoleRes.rows[0].id;

        // 2. Remove admin role
        const delRes = await db.query(`DELETE FROM user_role_assignments WHERE user_id = $1`, [userId]);
        console.log('DEBUG: Deleted rows:', delRes.rowCount);

        // 3. Assign viewer role
        await db.query(`
        INSERT INTO user_role_assignments (user_id, tenant_id, role_id)
        VALUES ($1, $2, $3)
    `, [userId, tenantId, viewerRoleId]);

        // Debug: Check current roles
        const currentRoles = await db.query(`
            SELECT r.key, ura.tenant_id 
            FROM user_role_assignments ura
            JOIN roles r ON r.id = ura.role_id
            WHERE ura.user_id = $1
        `, [userId]);
        console.log('DEBUG: Current Roles:', currentRoles.rows);
    });

    it('should login again to get new token with downgraded permissions', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: userEmail,
                password: userPassword
            });

        expect(res.status).toBe(200);
        accessToken = res.body.data.tokens.accessToken;

        // Debug: Decode token
        const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString());
        const fs = require('fs');
        fs.writeFileSync('token_debug.json', JSON.stringify(payload, null, 2));
    });

    it('should FAIL to create a project as viewer', async () => {
        const res = await request(app)
            .post('/api/projects')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                objectName: 'Unauthorized Project',
                client: 'Client',
                contractor: 'Contractor',
                address: 'Addr',
                startDate: '2024-01-01',
                endDate: '2024-12-31'
            });

        expect(res.status).toBe(403);
        expect(res.body.error).toBe('PERMISSION_DENIED');
    });
});
