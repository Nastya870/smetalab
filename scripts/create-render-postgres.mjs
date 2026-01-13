import https from 'https';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const RENDER_API_KEY = process.env.RENDER_API_KEY || 'rnd_YR79NQeNAoPnxUsR0Kn8Qe0hCYnm';

console.log('\n🚀 СОЗДАНИЕ POSTGRESQL НА RENDER\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function createPostgresDB() {
  const data = JSON.stringify({
    name: 'smetalab-db',
    databaseName: 'smetalab',
    databaseUser: 'smetalab_user',
    region: 'frankfurt',
    plan: 'free'
  });

  const options = {
    hostname: 'api.render.com',
    port: 443,
    path: '/v1/postgres',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RENDER_API_KEY}`,
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 201) {
          const response = JSON.parse(body);
          console.log('✅ PostgreSQL создан успешно!\n');
          console.log('📋 Детали:\n');
          console.log(`   ID: ${response.id}`);
          console.log(`   Name: ${response.name}`);
          console.log(`   Region: ${response.region}`);
          console.log(`   Plan: ${response.plan}`);
          console.log(`   Status: ${response.status}`);
          
          if (response.connectionInfo) {
            console.log('\n🔗 Connection Info:\n');
            console.log(`   External URL: ${response.connectionInfo.externalConnectionString || 'pending...'}`);
            console.log(`   Internal URL: ${response.connectionInfo.internalConnectionString || 'pending...'}`);
            console.log('\n⚠️  Connection strings появятся через 1-2 минуты после создания');
            console.log('   Проверьте в Dashboard: https://dashboard.render.com\n');
          }

          resolve(response);
        } else {
          console.error(`❌ Ошибка: HTTP ${res.statusCode}`);
          console.error('Ответ:', body);
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Ошибка запроса:', error.message);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Запуск
createPostgresDB().catch(err => {
  console.error('\n💥 Не удалось создать БД:', err.message);
  process.exit(1);
});
