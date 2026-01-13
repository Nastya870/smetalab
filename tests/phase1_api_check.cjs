const axios = require('axios');

const API_URL = 'http://localhost:3001/api';
const TIMESTAMP = Date.now();
const EMAIL = `tester_${TIMESTAMP}@test.com`;
const PASSWORD = 'Password123!';

async function runTest() {
    console.log('🚀 Starting Phase 1 API Test...');
    let token = '';
    let projectId = '';

    // 1. Register
    try {
        console.log(`\n1. Registering user ${EMAIL}...`);
        const regRes = await axios.post(`${API_URL}/auth/register`, {
            email: EMAIL,
            password: PASSWORD,
            fullName: 'Phase1 Tester',
            companyName: `Test Company ${TIMESTAMP}`,
            skipEmailVerification: true
        });
        console.log('✅ Registration successful:', regRes.status);

        if (regRes.data.data?.tokens?.accessToken) {
            token = regRes.data.data.tokens.accessToken;
            console.log('✅ Token received from registration (Test Mode).');
        }
    } catch (err) {
        console.error('❌ Registration failed:', err.response?.data || err.message);
    }

    // 2. Login (only if we didn't get token from register)
    if (!token) {
        try {
            console.log('\n2. Logging in...');
            const loginRes = await axios.post(`${API_URL}/auth/login`, {
                email: EMAIL,
                password: PASSWORD
            });
            token = loginRes.data.data.tokens.accessToken;
            console.log('✅ Login successful. Token received.');
        } catch (err) {
            console.error('❌ Login failed:', err.response?.data || err.message);
            return;
        }
    }

    const authHeader = { headers: { Authorization: `Bearer ${token}` } };

    // 3. Create Project (Happy Path)
    try {
        console.log('\n3. Creating Project (Valid)...');
        const projectData = {
            objectName: 'Test Project Phase 1',
            client: 'Test Client',
            contractor: 'Test Contractor',
            address: 'Test Address',
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            status: 'planning'
        };
        const projRes = await axios.post(`${API_URL}/projects`, projectData, authHeader);
        projectId = projRes.data.data.id;
        console.log('✅ Project created:', projectId);
    } catch (err) {
        console.error('❌ Create Project failed:', err.response?.data || err.message);
    }

    // 4. Create Project (Negative - Empty)
    try {
        console.log('\n4. Creating Project (Invalid - Empty)...');
        await axios.post(`${API_URL}/projects`, {}, authHeader);
        console.error('❌ Create Project (Empty) SHOULD have failed but succeeded!');
    } catch (err) {
        if (err.response?.status === 400 || err.response?.status === 500) {
            console.log('✅ Create Project (Empty) failed as expected:', err.response.status);
        } else {
            console.error('❌ Create Project (Empty) failed with unexpected status:', err.response?.status);
        }
    }

    // 5. Create Estimate
    if (projectId) {
        try {
            console.log('\n5. Creating Estimate...');
            const estRes = await axios.post(`${API_URL}/projects/${projectId}/estimates`, {
                name: 'Test Estimate',
                estimateType: 'строительство',
                description: 'Phase 1 Estimate'
            }, authHeader);
            console.log('✅ Estimate created:', estRes.data.id);
        } catch (err) {
            console.error('❌ Create Estimate failed:', err.response?.data || err.message);
        }
    }

    console.log('\n🏁 Phase 1 Test Completed.');
}

runTest();
