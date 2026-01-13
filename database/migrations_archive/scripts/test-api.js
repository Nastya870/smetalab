import fetch from 'node-fetch';

async function testAPI() {
  const baseURL = 'https://vite-ij731vboj-ilyas-projects-8ff82073.vercel.app';
  
  console.log('\n🧪 Тестирование API work-materials...\n');

  // Тест 1: Материалы для работы ID=3 (02-001)
  console.log('📋 Тест 1: GET /api/work-materials/by-work/3');
  try {
    const res1 = await fetch(`${baseURL}/api/work-materials/by-work/3`);
    const data1 = await res1.json();
    console.log('Status:', res1.status);
    console.log('Response:', JSON.stringify(data1, null, 2));
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
  }

  console.log('\n---\n');

  // Тест 2: Материалы для работы ID=4 (02-002)
  console.log('📋 Тест 2: GET /api/work-materials/by-work/4');
  try {
    const res2 = await fetch(`${baseURL}/api/work-materials/by-work/4`);
    const data2 = await res2.json();
    console.log('Status:', res2.status);
    console.log('Response:', JSON.stringify(data2, null, 2));
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
  }

  console.log('\n---\n');

  // Тест 3: Материалы для работы ID=5 (03-001)
  console.log('📋 Тест 3: GET /api/work-materials/by-work/5');
  try {
    const res3 = await fetch(`${baseURL}/api/work-materials/by-work/5`);
    const data3 = await res3.json();
    console.log('Status:', res3.status);
    console.log('Response:', JSON.stringify(data3, null, 2));
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
  }
}

testAPI();
