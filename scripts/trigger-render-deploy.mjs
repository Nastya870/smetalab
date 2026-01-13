import axios from 'axios';
import 'dotenv/config';

const RENDER_API_KEY = process.env.RENDER_API_KEY;
const SERVICE_ID = 'srv-d52grhfpm1nc73ent21g';

async function triggerDeploy() {
  try {
    console.log('🚀 Triggering deploy...\n');
    
    const response = await axios.post(
      `https://api.render.com/v1/services/${SERVICE_ID}/deploys`,
      { clearCache: 'do_not_clear' },
      {
        headers: {
          'Authorization': `Bearer ${RENDER_API_KEY}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Deploy triggered');
    console.log('Deploy ID:', response.data.id);
    console.log('Status:', response.data.status);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

triggerDeploy();
