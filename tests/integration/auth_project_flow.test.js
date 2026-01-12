import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../server/index.js';
import db from '../../server/config/database.js';

// @vitest-environment node

describe('Auth & Project Flow Integration', () => {
    const timestamp = Date.now();
    const userEmail = `integration_${timestamp}@test.com`;
    const userPassword = 'Password123!';
    let accessToken = '';
    let tenantId = '';

    // Clean up after tests
    afterAll(async () => {
        if (tenantId) {
            await db.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
        }
        await db.pool.end(); // Close pool connection
    });

    it('should register a new user and return tokens (Test Mode)', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                email: userEmail,
                password: userPassword,
                fullName: 'Integration Tester',
                companyName: `Integration Company ${timestamp}`,
                skipEmailVerification: true // Test Mode
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.tokens).toBeDefined();
        expect(res.body.data.tokens.accessToken).toBeDefined();

        accessToken = res.body.data.tokens.accessToken;
        tenantId = res.body.data.tenant.id;
    });

    it('should allow the new admin to create a project immediately', async () => {
        const res = await request(app)
            .post('/api/projects')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                objectName: 'Integration Project',
                client: 'Integration Client',
                contractor: 'Integration Contractor',
                address: '123 Test St',
                startDate: '2024-01-01',
                endDate: '2024-12-31',
                status: 'planning'
            });

        if (res.status !== 201) {
            console.error('Create Project Error:', res.body);
        }

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();
        expect(res.body.data.id).toBeDefined();
    });
});
