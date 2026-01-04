/**
 * Baseline тестирование поиска с сохранением метрик
 */

import fs from 'fs/promises';
import axios from 'axios';
import 'dotenv/config';

const BACKEND_URL = 'https://smetalab-backend.onrender.com';
const EMAIL = 'kiy026@yandex.ru';
const PASSWORD = process.env.TEST_PASSWORD;
const BASELINE_FILE = './tests/search-baseline.json';
const RESULTS_DIR = './tests/results';

console.log('📊 BASELINE ТЕСТИРОВАНИЕ ПОИСКА\n');
console.log('='.repeat(70));

// Загрузка тестов
console.log('\n📋 Загрузка baseline тестов...');
const baselineData = JSON.parse(await fs.readFile(BASELINE_FILE, 'utf-8'));
const allQueries = baselineData.tests.flatMap(cat => 
  cat.queries.map(q => ({ ...q, category: cat.category }))
);
console.log(`✅ Загружено ${allQueries.length} тестовых запросов\n`);

// Авторизация
console.log('🔑 Авторизация...');
const loginRes = await axios.post(`${BACKEND_URL}/api/auth/login`, {
  email: EMAIL,
  password: PASSWORD
});
const token = loginRes.data.data?.tokens?.accessToken || loginRes.data.tokens?.accessToken;
console.log('✅ Токен получен\n');

// Результаты
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const results = {
  timestamp,
  version: baselineData.version,
  mode: 'semantic_only', // пока только semantic
  total_queries: allQueries.length,
  queries: []
};

let totalQueries = 0;
let totalRelevant = 0; // top-3 с релевантностью > 0.6

// Запуск тестов
console.log('🧪 Выполнение запросов...\n');

for (const test of allQueries) {
  try {
    console.log(`[${test.id}] "${test.query}" (${test.category})`);
    
    const response = await axios.post(
      `${BACKEND_URL}/api/search/pinecone`,
      {
        query: test.query,
        type: test.type,
        limit: 5
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    const { count, results: searchResults } = response.data;
    
    // Сохраняем top-5
    const top5 = searchResults.slice(0, 5).map(r => ({
      id: r.id,
      dbId: r.dbId,
      score: r.score,
      text: r.text.substring(0, 100)
    }));
    
    // Проверяем top-3 релевантность
    const top3 = searchResults.slice(0, 3);
    const relevantInTop3 = top3.filter(r => r.score > 0.6).length;
    const precision = top3.length > 0 ? relevantInTop3 / 3 : 0;
    
    // Проверяем наличие ключевых слов в top-3
    const keywordsFound = test.expected_keywords?.filter(keyword => 
      top3.some(r => r.text.toLowerCase().includes(keyword.toLowerCase()))
    ) || [];
    
    const keywordMatch = test.expected_keywords?.length > 0 
      ? keywordsFound.length / test.expected_keywords.length 
      : 0;
    
    totalQueries++;
    if (relevantInTop3 > 0) totalRelevant++;
    
    console.log(`   Top score: ${top5[0]?.score.toFixed(3) || 'N/A'}`);
    console.log(`   Relevant in top-3: ${relevantInTop3}/3`);
    console.log(`   Keyword match: ${(keywordMatch * 100).toFixed(0)}%`);
    
    results.queries.push({
      id: test.id,
      category: test.category,
      query: test.query,
      type: test.type,
      count,
      top5,
      metrics: {
        top_score: top5[0]?.score || 0,
        relevant_in_top3: relevantInTop3,
        precision_at_3: precision,
        keyword_match: keywordMatch,
        keywords_found: keywordsFound
      }
    });
    
    // Пауза между запросами
    await new Promise(resolve => setTimeout(resolve, 300));
    
  } catch (error) {
    console.log(`   ❌ Ошибка: ${error.response?.data?.message || error.message}`);
    
    results.queries.push({
      id: test.id,
      category: test.category,
      query: test.query,
      type: test.type,
      error: error.message
    });
  }
}

// Подсчёт метрик по категориям
console.log('\n' + '='.repeat(70));
console.log('\n📊 ИТОГОВЫЕ МЕТРИКИ\n');

const byCategory = {};
for (const cat of ['exact', 'general', 'intent']) {
  const catQueries = results.queries.filter(q => q.category === cat && !q.error);
  
  if (catQueries.length === 0) continue;
  
  const avgScore = catQueries.reduce((sum, q) => sum + (q.metrics?.top_score || 0), 0) / catQueries.length;
  const avgPrecision = catQueries.reduce((sum, q) => sum + (q.metrics?.precision_at_3 || 0), 0) / catQueries.length;
  const avgKeywordMatch = catQueries.reduce((sum, q) => sum + (q.metrics?.keyword_match || 0), 0) / catQueries.length;
  
  byCategory[cat] = {
    count: catQueries.length,
    avg_top_score: avgScore,
    avg_precision_at_3: avgPrecision,
    avg_keyword_match: avgKeywordMatch
  };
  
  console.log(`${cat.toUpperCase()}:`);
  console.log(`  Запросов: ${catQueries.length}`);
  console.log(`  Средний top score: ${avgScore.toFixed(3)}`);
  console.log(`  Средняя точность@3: ${(avgPrecision * 100).toFixed(1)}%`);
  console.log(`  Совпадение keywords: ${(avgKeywordMatch * 100).toFixed(1)}%`);
  console.log();
}

results.summary = {
  total_queries: totalQueries,
  successful: results.queries.filter(q => !q.error).length,
  failed: results.queries.filter(q => q.error).length,
  by_category: byCategory
};

// Сохранение результатов
await fs.mkdir(RESULTS_DIR, { recursive: true });
const resultsFile = `${RESULTS_DIR}/baseline-${timestamp}.json`;
await fs.writeFile(resultsFile, JSON.stringify(results, null, 2));

console.log('='.repeat(70));
console.log(`\n💾 Результаты сохранены: ${resultsFile}`);
console.log(`\n📈 Общая статистика:`);
console.log(`   Всего запросов: ${totalQueries}`);
console.log(`   Успешных: ${results.summary.successful}`);
console.log(`   С ошибками: ${results.summary.failed}`);
console.log(`   Релевантных (>0.6): ${totalRelevant} (${(totalRelevant/totalQueries*100).toFixed(1)}%)`);
