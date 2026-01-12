
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

async function testLogin(email, password) {
    try {
        console.log(`Testing login for ${email} with password ${password}...`);
        const res = await axios.post(`${API_URL}/auth/login`, {
            email,
            password
        });
        console.log('✅ Login successful!');
        console.log('User:', res.data.data.user.email);
        console.log('Roles:', res.data.data.user.roles);
    } catch (err) {
        console.error('❌ Login failed:', err.response?.data?.message || err.message);
    }
}

async function run() {
    await testLogin('admin@smetka.ru', 'Admin123!');
    await testLogin('admin@smetalab.com', 'admin');
}

run();
