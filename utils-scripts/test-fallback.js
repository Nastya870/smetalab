// Тест fallback алгоритма напрямую без БД

function normalizeForSearch(text) {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^а-яa-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function fallbackTextSearch(query, items, textField, limit) {
  const queryNorm = normalizeForSearch(query);
  const queryWords = queryNorm.split(' ').filter(w => w.length > 2);
  
  console.log(`Query normalized: "${queryNorm}"`);
  console.log(`Query words:`, queryWords);
  
  const results = items
    .map(item => {
      const textNorm = normalizeForSearch(item[textField] || '');
      const textWords = textNorm.split(' ');
      
      // Точное совпадение
      if (textNorm === queryNorm) {
        return { ...item, similarity: 1.0 };
      }
      
      // Содержит весь запрос
      if (textNorm.includes(queryNorm)) {
        return { ...item, similarity: 0.85 };
      }
      
      // Пословное совпадение
      let matchScore = 0;
      let matchedWords = 0;
      
      for (const qw of queryWords) {
        for (const tw of textWords) {
          if (tw === qw) {
            matchScore += 1.0;
            matchedWords++;
            break;
          }
          if (tw.startsWith(qw)) {
            matchScore += 0.8;
            matchedWords++;
            break;
          }
          if (tw.includes(qw)) {
            matchScore += 0.6;
            matchedWords++;
            break;
          }
          if (qw.includes(tw) && tw.length > 2) {
            matchScore += 0.5;
            matchedWords++;
            break;
          }
        }
      }
      
      if (matchedWords > 0) {
        const similarity = (matchScore / queryWords.length) * 0.75;
        console.log(`  "${item[textField]}" → matched ${matchedWords}/${queryWords.length} words, score: ${similarity.toFixed(3)}`);
        return { ...item, similarity };
      }
      
      return null;
    })
    .filter(item => item !== null && item.similarity >= 0.3)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
  
  return results;
}

// Тестовые данные
const materials = [
  { id: 1, name: 'Штукатурка гипсовая Ротбанд 30кг' },
  { id: 2, name: 'Штукатурка цементная' },
  { id: 3, name: 'Шпаклевка гипсовая Ротбанд' },
  { id: 4, name: 'Смесь штукатурная Кнауф Ротбанд' },
  { id: 5, name: 'Ротбанд финиш' }
];

console.log('\n=== ТЕСТ 1: "штукатурка ротбанд" ===\n');
const results1 = fallbackTextSearch('штукатурка ротбанд', materials, 'name', 10);
console.log(`\n✅ Найдено: ${results1.length}\n`);
results1.forEach((r, i) => {
  console.log(`${i+1}. [${(r.similarity * 100).toFixed(1)}%] ${r.name}`);
});

console.log('\n\n=== ТЕСТ 2: "штукатурка" ===\n');
const results2 = fallbackTextSearch('штукатурка', materials, 'name', 10);
console.log(`\n✅ Найдено: ${results2.length}\n`);
results2.forEach((r, i) => {
  console.log(`${i+1}. [${(r.similarity * 100).toFixed(1)}%] ${r.name}`);
});
