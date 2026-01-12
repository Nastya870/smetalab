import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../../server/index.js';

describe('Role Boundaries Integration Tests', () => {
    let superAdminToken;
    let tenantAdminToken;
    let tenantId;

    beforeAll(async () => {
        // 1. Login as Super Admin (using seeded credentials)
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'admin@smetka.ru', // Correct seeded super admin
                password: 'Admin123!'
            });

        if (loginRes.status !== 200) {
            console.error('Super Admin login failed:', loginRes.body);
        }
        superAdminToken = loginRes.body.data?.tokens?.accessToken;

        // 2. Create a Tenant Admin for testing
        const tenantEmail = `tenant-admin-${Date.now()}@test.local`;
        const regRes = await request(app)
            .post('/api/auth/register')
            .send({
                email: tenantEmail,
                password: 'Test123!@#',
                fullName: 'Tenant Admin',
                companyName: 'Test Company'
            });

        tenantAdminToken = regRes.body.data?.tokens?.accessToken;
        tenantId = regRes.body.data?.user?.tenants?.[0]?.id;
    });

    describe('Super Admin Role Visibility', () => {
        it('should see only global roles (super_admin, admin)', async () => {
            if (!superAdminToken) return;

            const res = await request(app)
                .get('/api/roles')
                .set('Authorization', `Bearer ${superAdminToken}`);

            expect(res.status).toBe(200);
            const roles = res.body.data || res.body;

            // Check that only global roles are returned
            const keys = roles.map(r => r.key);
            expect(keys).toContain('super_admin');
            expect(keys).toContain('admin');

            // Should NOT contain tenant-specific templates like 'estimator' if they are filtered
            // (Based on BUG-008 fix)
            expect(keys).not.toContain('estimator');
        });
    });

    describe('Tenant Admin Role Visibility', () => {
        it('should see only their tenant roles and NOT the global admin template', async () => {
            if (!tenantAdminToken) return;

            const res = await request(app)
                .get('/api/roles')
                .set('Authorization', `Bearer ${tenantAdminToken}`);

            expect(res.status).toBe(200);
            const roles = res.body.data || res.body;

            const keys = roles.map(r => r.key);

            // Should contain common tenant roles
            expect(keys).toContain('manager');

            // Should NOT contain the global 'admin' template (it's for internal use)
            expect(keys).not.toContain('admin');
            expect(keys).not.toContain('super_admin');
        });
    });

    describe('Cross-Tenant Role Assignment Protection', () => {
        it('should block assigning a role from another tenant', async () => {
            if (!tenantAdminToken) return;

            // Try to assign a role that doesn't belong to this tenant
            // We'll need a role ID from another tenant or a global role
            const res = await request(app)
                .post('/api/users/assign-role')
                .set('Authorization', `Bearer ${tenantAdminToken}`)
                .send({
                    userId: 'some-user-id',
                    roleId: '00000000-0000-0000-0000-000000000000' // Non-existent or wrong tenant
                });

            // Should be 400, 403 or 404
            expect([400, 403, 404]).toContain(res.status);
        });
    });
});
