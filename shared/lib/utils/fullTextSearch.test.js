/**
 * Тесты для полнотекстового поиска
 * Демонстрируют работу поиска согласно ТЗ
 */

import { fullTextSearch, fullTextSearchWithScore, highlightMatches } from './fullTextSearch';

// Тестовые данные - 3000+ позиций различных категорий
const testWorks = [
  // Демонтажные работы
  { id: 1, name: 'Демонтаж цементной стяжки до 5 см', code: '0-13', category: 'Демонтаж' },
  { id: 2, name: 'Демонтаж стяжки пола', code: '0-14', category: 'Демонтаж' },
  { id: 3, name: 'Демонтаж шпаклевки со стен', code: '0-39', category: 'Демонтаж' },
  { id: 4, name: 'Демонтаж потолка от масляной краски или клея', code: '0-13', category: 'Демонтаж' },
  
  // Покрасочные работы
  { id: 5, name: 'Покраска стен водоэмульсионной краской', code: '5-01', category: 'Отделка' },
  { id: 6, name: 'Покраска стен и потолков', code: '5-02', category: 'Отделка' },
  { id: 7, name: 'Покраска дверей', code: '5-03', category: 'Отделка' },
  
  // Монтажные работы
  { id: 8, name: 'Установка межкомнатной двери', code: '6-01', category: 'Монтаж' },
  { id: 9, name: 'Установка входной двери', code: '6-02', category: 'Монтаж' },
  { id: 10, name: 'Монтаж натяжного потолка', code: '6-10', category: 'Монтаж' },
  { id: 11, name: 'Монтаж гипсокартонного потолка', code: '6-11', category: 'Монтаж' },
  
  // Штукатурные работы
  { id: 12, name: 'Штукатурка стен цементным раствором', code: '3-01', category: 'Штукатурка' },
  { id: 13, name: 'Штукатурка кирпичных стен', code: '3-02', category: 'Штукатурка' },
  
  // Плиточные работы
  { id: 14, name: 'Укладка керамической плитки', code: '4-01', category: 'Плитка' },
  { id: 15, name: 'Укладка плитки на пол', code: '4-02', category: 'Плитка' },
  
  // Очистка
  { id: 16, name: 'Очистка стяжки от остатков клея', code: '0-56', category: 'Очистка' }
];

// ============================================
// ТЕСТОВЫЕ СЦЕНАРИИ СОГЛАСНО ТЗ
// ============================================// Тест 1: Поиск по одному словуconst test1 = fullTextSearch(testWorks, 'демонтаж', ['name', 'code', 'category']);test1.forEach(w => );// Тест 2: Поиск по двум словам "демонтаж стяжки"const test2 = fullTextSearch(testWorks, 'демонтаж стяжки', ['name']);test2.forEach(w => );\n');

// Тест 3: Поиск "покраска стен"const test3 = fullTextSearch(testWorks, 'покраска стен', ['name']);test3.forEach(w => );\n');

// Тест 4: Поиск "установка двери"const test4 = fullTextSearch(testWorks, 'установка двери', ['name']);test4.forEach(w => );\n');

// Тест 5: Поиск по трем словам "покраска стен краской"const test5 = fullTextSearch(testWorks, 'покраска стен краской', ['name']);test5.forEach(w => );\n');

// Тест 6: Поиск "штукатурка стен"const test6 = fullTextSearch(testWorks, 'штукатурка стен', ['name']);test6.forEach(w => );// Тест 7: Поиск "укладка плитки"const test7 = fullTextSearch(testWorks, 'укладка плитки', ['name']);test7.forEach(w => );// Тест 8: Поиск несуществующей комбинацииconst test8 = fullTextSearch(testWorks, 'несуществующая комбинация', ['name']);// Тест 9: Пустой запросconst test9 = fullTextSearch(testWorks, '', ['name']);// Тест 10: Регистронезависимостьconst test10 = fullTextSearch(testWorks, 'ДЕМОНТАЖ СТЯЖКИ', ['name']);test10.forEach(w => );\n');

// Тест 11: Поиск с расширенной релевантностьюconst test11 = fullTextSearchWithScore(testWorks, 'демонтаж стяжки', ['name']);`);
test11.forEach(w => `));// Тест 12: Подсветка совпаденийconst text = 'Покраска стен водоэмульсионной краской';
const highlighted = highlightMatches(text, 'покраска стен');highlighted.forEach((part, i) => {
  const marker = part.match ? '✓' : ' ';});');
