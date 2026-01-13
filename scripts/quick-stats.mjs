/**
 * Быстрая проверка статистики Pinecone через API
 */

import axios from 'axios';
import 'dotenv/config';

const BACKEND_URL = 'https://smetalab-backend.onrender.com';
const EMAIL = 'kiy026@yandex.ru';
const PASSWORD = process.env.TEST_PASSWORD;

console.log('🚀 Быстрая проверка Pinecone индекса\n');

async function main() {
  try {
    // Логин
    console.log('🔑 Логин...');
    const loginRes = await axios.post(`${BACKEND_URL}/api/auth/login`, {
      email: EMAIL,
      password: PASSWORD
    });
    
    const token = loginRes.data.data?.tokens?.accessToken || loginRes.data.tokens?.accessToken;
    if (!token) {
      console.log('Response:', JSON.stringify(loginRes.data, null, 2));
      throw new Error('Токен не получен. Проверь email/пароль');
    }
    console.log('✅ Токен получен\n');
    
    // Получаем статистику
    console.log('📊 Получение статистики индекса...');
    const statsRes = await axios.get(`${BACKEND_URL}/api/search/pinecone/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const { stats } = statsRes.data;
    
    // Извлекаем количество векторов из namespaces
    const vectorCount = stats.totalVectors || stats.namespaces?.['']?.recordCount || 0;
    
    console.log('\n✅ СТАТИСТИКА ИНДЕКСА:');
    console.log('='.repeat(50));
    console.log(`📈 Всего векторов: ${vectorCount.toLocaleString()}`);
    console.log(`📏 Размерность: ${stats.dimension}`);
    console.log(`📦 Namespaces:`, JSON.stringify(stats.namespaces, null, 2));
    console.log('='.repeat(50));
    
    if (vectorCount >= 50000) {
      console.log('\n🎉 ОТЛИЧНО! Индекс заполнен полностью!');
      console.log(`   ${vectorCount.toLocaleString()} векторов готовы к поиску`);
    } else if (vectorCount > 0) {
      console.log(`\n⚠️  Индекс содержит ${vectorCount.toLocaleString()} векторов (ожидалось ~50K)`);
    } else {
      console.log('\n❌ Индекс пустой или статистика недоступна');
    }
    
  } catch (error) {
    console.error('\n❌ Ошибка:', error.response?.data?.message || error.message);
    if (!PASSWORD) {
      console.log('\n💡 Добавь TEST_PASSWORD в .env файл');
    }
  }
}

main();
