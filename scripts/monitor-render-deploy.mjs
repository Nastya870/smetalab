/**
 * Мониторинг деплоя на Render
 * Использует Render API для отслеживания статуса
 */

import https from 'https';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

const RENDER_API_KEY = process.env.RENDER_API_KEY;
const SERVICE_ID = 'srv-d52grhfpm1nc73ent21g'; // smetalab-backend

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.render.com',
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${RENDER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function checkDeploy() {
  try {
    const response = await makeRequest(`/v1/services/${SERVICE_ID}/deploys?limit=1`);
    
    if (!response || !response.deploy || response.deploy.length === 0) {
      console.error('No deploys found');
      return null;
    }
    
    const deploy = response.deploy[0];
    
    return {
      id: deploy.id,
      status: deploy.status,
      createdAt: deploy.createdAt,
      finishedAt: deploy.finishedAt,
      commit: deploy.commit?.message?.substring(0, 80)
    };
  } catch (error) {
    console.error('Error:', error.message);
    return null;
  }
}

async function monitorDeploy() {
  console.log('\n🚀 Monitoring Render Deploy...\n');
  console.log(`Service ID: ${SERVICE_ID}`);
  console.log('Checking every 10 seconds...\n');
  
  let lastStatus = '';
  let attempts = 0;
  const maxAttempts = 60; // 10 минут
  
  while (attempts < maxAttempts) {
    const deploy = await checkDeploy();
    
    if (!deploy) {
      console.log('❌ Failed to check deploy status');
      break;
    }
    
    if (deploy.status !== lastStatus) {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] Status: ${deploy.status.toUpperCase()}`);
      
      if (deploy.status === 'live') {
        console.log('\n✅ Deploy complete! Service is LIVE');
        console.log(`Finished at: ${deploy.finishedAt}`);
        console.log(`\nBackend URL: https://smetalab-backend.onrender.com`);
        break;
      }
      
      if (deploy.status === 'build_failed' || deploy.status === 'failed') {
        console.log('\n❌ Deploy FAILED');
        console.log('Check logs at: https://dashboard.render.com/');
        break;
      }
      
      lastStatus = deploy.status;
    } else {
      process.stdout.write('.');
    }
    
    await new Promise(resolve => setTimeout(resolve, 10000)); // 10 секунд
    attempts++;
  }
  
  if (attempts >= maxAttempts) {
    console.log('\n⏰ Timeout reached. Check manually at https://dashboard.render.com/');
  }
}

monitorDeploy();
