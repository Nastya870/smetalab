/**
 * Сравнение Semantic vs Hybrid режимов
 */

import fs from 'fs/promises';
import axios from 'axios';
import 'dotenv/config';

const BACKEND_URL = 'https://smetalab-backend.onrender.com';
const EMAIL = 'kiy026@yandex.ru';
const PASSWORD = process.env.TEST_PASSWORD;
const BASELINE_FILE = './tests/search-baseline.json';
const RESULTS_DIR = './tests/results';

console.log('🔬 СРАВНЕНИЕ SEMANTIC vs HYBRID\n');
console.log('='.repeat(70));

// Загрузка тестов
const baselineData = JSON.parse(await fs.readFile(BASELINE_FILE, 'utf-8'));
const allQueries = baselineData.tests.flatMap(cat => 
  cat.queries.map(q => ({ ...q, category: cat.category }))
);

// Авторизация
console.log('\n🔑 Авторизация...');
const loginRes = await axios.post(`${BACKEND_URL}/api/auth/login`, {
  email: EMAIL,
  password: PASSWORD
});
const token = loginRes.data.data?.tokens?.accessToken || loginRes.data.tokens?.accessToken;
console.log('✅ Токен получен\n');

// Функция для запуска тестов в определённом режиме
async function runTests(mode) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`\n🧪 Тестирование: ${mode.toUpperCase()}\n`);
  
  const results = [];
  
  for (const test of allQueries) {
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/search/pinecone`,
        {
          query: test.query,
          type: test.type,
          limit: 5,
          mode: mode // 'semantic' или 'hybrid'
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      const { results: searchResults, mode: actualMode } = response.data;
      
      const top5 = searchResults.slice(0, 5);
      const top3 = searchResults.slice(0, 3);
      
      const topScore = top5[0]?.score || 0;
      const relevantInTop3 = top3.filter(r => r.score > 0.6).length;
      const precision = relevantInTop3 / 3;
      
      // Проверка keywords в top-3
      const keywordsFound = test.expected_keywords?.filter(keyword => 
        top3.some(r => r.text.toLowerCase().includes(keyword.toLowerCase()))
      ) || [];
      
      const keywordMatch = test.expected_keywords?.length > 0 
        ? keywordsFound.length / test.expected_keywords.length 
        : 0;
      
      console.log(`[${test.id}] "${test.query}"`);
      console.log(`   Mode: ${actualMode} | Top: ${topScore.toFixed(3)} | P@3: ${(precision*100).toFixed(0)}% | KW: ${(keywordMatch*100).toFixed(0)}%`);
      
      results.push({
        id: test.id,
        category: test.category,
        query: test.query,
        mode: actualMode,
        top_score: topScore,
        precision_at_3: precision,
        keyword_match: keywordMatch,
        top5: top5.map(r => ({
          id: r.id,
          score: r.score,
          source: r.source,
          text: r.text.substring(0, 80)
        }))
      });
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.log(`[${test.id}] ❌ Ошибка: ${error.message}`);
      results.push({ id: test.id, error: error.message });
    }
  }
  
  return results;
}

// Запускаем оба режима
const semanticResults = await runTests('semantic');
const hybridResults = await runTests('hybrid');

// Сравнение результатов
console.log('\n' + '='.repeat(70));
console.log('\n📊 СРАВНИТЕЛЬНЫЙ АНАЛИЗ\n');

function calculateMetrics(results) {
  const valid = results.filter(r => !r.error);
  
  const byCategory = {};
  for (const cat of ['exact', 'general', 'intent']) {
    const catResults = valid.filter(r => r.category === cat);
    
    if (catResults.length === 0) continue;
    
    byCategory[cat] = {
      count: catResults.length,
      avg_score: catResults.reduce((s, r) => s + r.top_score, 0) / catResults.length,
      avg_precision: catResults.reduce((s, r) => s + r.precision_at_3, 0) / catResults.length,
      avg_keyword_match: catResults.reduce((s, r) => s + r.keyword_match, 0) / catResults.length
    };
  }
  
  return {
    total: valid.length,
    avg_score: valid.reduce((s, r) => s + r.top_score, 0) / valid.length,
    avg_precision: valid.reduce((s, r) => s + r.precision_at_3, 0) / valid.length,
    avg_keyword_match: valid.reduce((s, r) => s + r.keyword_match, 0) / valid.length,
    by_category: byCategory
  };
}

const semanticMetrics = calculateMetrics(semanticResults);
const hybridMetrics = calculateMetrics(hybridResults);

console.log('SEMANTIC ONLY:');
console.log(`  Avg Score:       ${semanticMetrics.avg_score.toFixed(3)}`);
console.log(`  Avg Precision@3: ${(semanticMetrics.avg_precision * 100).toFixed(1)}%`);
console.log(`  Avg KW Match:    ${(semanticMetrics.avg_keyword_match * 100).toFixed(1)}%\n`);

console.log('HYBRID (Keyword + Semantic):');
console.log(`  Avg Score:       ${hybridMetrics.avg_score.toFixed(3)}`);
console.log(`  Avg Precision@3: ${(hybridMetrics.avg_precision * 100).toFixed(1)}%`);
console.log(`  Avg KW Match:    ${(hybridMetrics.avg_keyword_match * 100).toFixed(1)}%\n`);

console.log('УЛУЧШЕНИЕ:');
const scoreImprovement = ((hybridMetrics.avg_score - semanticMetrics.avg_score) / semanticMetrics.avg_score * 100);
const precisionImprovement = ((hybridMetrics.avg_precision - semanticMetrics.avg_precision) / semanticMetrics.avg_precision * 100);
const kwImprovement = ((hybridMetrics.avg_keyword_match - semanticMetrics.avg_keyword_match) / semanticMetrics.avg_keyword_match * 100);

console.log(`  Score:       ${scoreImprovement > 0 ? '+' : ''}${scoreImprovement.toFixed(1)}%`);
console.log(`  Precision@3: ${precisionImprovement > 0 ? '+' : ''}${precisionImprovement.toFixed(1)}%`);
console.log(`  KW Match:    ${kwImprovement > 0 ? '+' : ''}${kwImprovement.toFixed(1)}%\n`);

// Детализация по категориям
console.log('ПО КАТЕГОРИЯМ:\n');

for (const cat of ['exact', 'general', 'intent']) {
  const sem = semanticMetrics.by_category[cat];
  const hyb = hybridMetrics.by_category[cat];
  
  if (!sem || !hyb) continue;
  
  console.log(`${cat.toUpperCase()}:`);
  console.log(`  Semantic:  Score ${sem.avg_score.toFixed(3)} | P@3 ${(sem.avg_precision*100).toFixed(0)}%`);
  console.log(`  Hybrid:    Score ${hyb.avg_score.toFixed(3)} | P@3 ${(hyb.avg_precision*100).toFixed(0)}%`);
  
  const catScoreImp = ((hyb.avg_score - sem.avg_score) / sem.avg_score * 100);
  const catPrecImp = ((hyb.avg_precision - sem.avg_precision) / sem.avg_precision * 100);
  
  console.log(`  Улучшение: ${catScoreImp > 0 ? '+' : ''}${catScoreImp.toFixed(1)}% score, ${catPrecImp > 0 ? '+' : ''}${catPrecImp.toFixed(1)}% precision\n`);
}

// Сохранение результатов
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const comparison = {
  timestamp,
  semantic: semanticResults,
  hybrid: hybridResults,
  metrics: {
    semantic: semanticMetrics,
    hybrid: hybridMetrics
  }
};

await fs.mkdir(RESULTS_DIR, { recursive: true });
const comparisonFile = `${RESULTS_DIR}/comparison-${timestamp}.json`;
await fs.writeFile(comparisonFile, JSON.stringify(comparison, null, 2));

console.log('='.repeat(70));
console.log(`\n💾 Результаты сохранены: ${comparisonFile}`);

// Итоговая рекомендация
if (hybridMetrics.avg_score > semanticMetrics.avg_score * 1.1) {
  console.log('\n✅ РЕКОМЕНДАЦИЯ: Hybrid search показывает значительное улучшение (+10%+)');
  console.log('   Рекомендуется использовать hybrid по умолчанию.');
} else if (hybridMetrics.avg_score > semanticMetrics.avg_score) {
  console.log('\n⚠️  РЕКОМЕНДАЦИЯ: Hybrid показывает небольшое улучшение.');
  console.log('   Можно использовать для коротких/категорийных запросов.');
} else {
  console.log('\n❌ ВНИМАНИЕ: Hybrid не показал улучшения.');
  console.log('   Требуется доработка keyword поиска или весов.');
}
