import axios from 'axios';
import 'dotenv/config';

const RENDER_API_KEY = process.env.RENDER_API_KEY;
const SERVICE_ID = 'srv-d52grhfpm1nc73ent21g';

async function triggerDeploy() {
  try {
    console.log('🚀 Triggering deploy with CLEAR CACHE...\n');
    
    const response = await axios.post(
      `https://api.render.com/v1/services/${SERVICE_ID}/deploys`,
      { clearCache: 'clear' }, // ОЧИСТИТЬ КЭШ
      {
        headers: {
          'Authorization': `Bearer ${RENDER_API_KEY}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Deploy triggered with clear cache');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

triggerDeploy();
