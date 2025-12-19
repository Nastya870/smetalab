import pkg from 'pg';
const { Client } = pkg;

const RENDER_URL = 'postgresql://smetalab_user:KJPh8y7plWvVIK2xiTeu9ROpUEk0QFSh@dpg-d51t19f6s9ss73eui8k0-a.frankfurt-postgres.render.com/smetalab_yay5';

const client = new Client({ 
  connectionString: RENDER_URL,
  ssl: { rejectUnauthorized: false }
});

async function setupExtensions() {
  try {
    await client.connect();
    console.log('✅ Подключено к Render PostgreSQL\n');

    console.log('📦 Создание расширения citext...');
    await client.query('CREATE EXTENSION IF NOT EXISTS citext;');
    console.log('✅ Расширение citext создано\n');

    await client.end();
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    await client.end();
    process.exit(1);
  }
}

setupExtensions();
