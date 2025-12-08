/**
 * Тесты для полнотекстового поиска
 * Демонстрируют работу поиска согласно ТЗ
 */

import { fullTextSearch, fullTextSearchWithScore, highlightMatches } from '../../../shared/lib/utils/fullTextSearch';

// Тестовые данные - различные категории работ
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

describe('Full Text Search', () => {
  
  describe('fullTextSearch', () => {
    
    test('should find results by single word', () => {
      const results = fullTextSearch(testWorks, 'демонтаж', ['name', 'code', 'category']);
      expect(results.length).toBeGreaterThan(0);
      results.forEach(w => {
        expect(w.name.toLowerCase()).toContain('демонтаж');
      });
    });

    test('should find results by two words "демонтаж стяжки"', () => {
      const results = fullTextSearch(testWorks, 'демонтаж стяжки', ['name']);
      expect(results.length).toBeGreaterThan(0);
      results.forEach(w => {
        const nameLower = w.name.toLowerCase();
        expect(nameLower.includes('демонтаж') || nameLower.includes('стяжк')).toBe(true);
      });
    });

    test('should find "покраска стен"', () => {
      const results = fullTextSearch(testWorks, 'покраска стен', ['name']);
      expect(results.length).toBeGreaterThan(0);
    });

    test('should find "установка двери"', () => {
      const results = fullTextSearch(testWorks, 'установка двери', ['name']);
      expect(results.length).toBeGreaterThan(0);
    });

    test('should find by three words "покраска стен краской"', () => {
      const results = fullTextSearch(testWorks, 'покраска стен краской', ['name']);
      expect(results.length).toBeGreaterThan(0);
    });

    test('should find "штукатурка стен"', () => {
      const results = fullTextSearch(testWorks, 'штукатурка стен', ['name']);
      expect(results.length).toBeGreaterThan(0);
    });

    test('should find "укладка плитки"', () => {
      const results = fullTextSearch(testWorks, 'укладка плитки', ['name']);
      expect(results.length).toBeGreaterThan(0);
    });

    test('should find cable by size with comma and cyrillic x', () => {
      const materials = [
        ...testWorks,
        { id: 100, name: 'Кабель Конкорд ВВГПнг(А)-LS 3х2,5 (100 м)', code: 'CBL-01' }
      ];

      const results = fullTextSearch(materials, 'кабель 3х2,5', ['name']);
      const ids = results.map((r) => r.id);
      expect(ids).toContain(100);
    });

    test('should find cable by size with latin x and dot', () => {
      const materials = [
        ...testWorks,
        { id: 101, name: 'Кабель Конкорд ВВГПнг(А)-LS 3x2.5 (100 м)', code: 'CBL-02' }
      ];

      const results = fullTextSearch(materials, 'кабель 3х2,5', ['name']);
      const ids = results.map((r) => r.id);
      expect(ids).toContain(101);
    });

    test('should NOT find "кабель 3" in "300 мм" - number boundary check', () => {
      const materials = [
        { id: 200, name: 'Лента сигнальная Осторожно кабель 300 мм 100 м красная', code: 'TAPE-01' },
        { id: 201, name: 'Кабель ВВГПнг 3x2.5 (100 м)', code: 'CBL-03' },
        { id: 202, name: 'Кабель NYM 3x1.5 (50 м)', code: 'CBL-04' }
      ];

      const results = fullTextSearch(materials, 'кабель 3', ['name']);
      const ids = results.map((r) => r.id);
      // Должен найти кабели с "3x..." но НЕ ленту с "300"
      expect(ids).toContain(201);
      expect(ids).toContain(202);
      expect(ids).not.toContain(200); // Лента с "300 мм" не должна найтись
    });

    test('should return empty for non-existent combination', () => {
      const results = fullTextSearch(testWorks, 'несуществующая комбинация', ['name']);
      expect(results.length).toBe(0);
    });

    test('should return all items for empty query', () => {
      const results = fullTextSearch(testWorks, '', ['name']);
      expect(results.length).toBe(testWorks.length);
    });

    test('should be case insensitive', () => {
      const results = fullTextSearch(testWorks, 'ДЕМОНТАЖ СТЯЖКИ', ['name']);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('fullTextSearchWithScore', () => {
    
    test('should return results with scores', () => {
      const results = fullTextSearchWithScore(testWorks, 'демонтаж стяжки', ['name']);
      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        expect(r).toHaveProperty('_matchScore');
        expect(typeof r._matchScore).toBe('number');
      });
    });

    test('should sort results by score descending', () => {
      const results = fullTextSearchWithScore(testWorks, 'демонтаж стяжки', ['name']);
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1]._matchScore).toBeGreaterThanOrEqual(results[i]._matchScore);
      }
    });
  });

  describe('highlightMatches', () => {
    
    test('should highlight matching words', () => {
      const text = 'Покраска стен водоэмульсионной краской';
      const highlighted = highlightMatches(text, 'покраска стен');
      expect(Array.isArray(highlighted)).toBe(true);
      expect(highlighted.length).toBeGreaterThan(0);
    });

    test('should mark matched parts correctly', () => {
      const text = 'Покраска стен водоэмульсионной краской';
      const highlighted = highlightMatches(text, 'покраска стен');
      const matchedParts = highlighted.filter(p => p.match);
      expect(matchedParts.length).toBeGreaterThan(0);
    });
  });
});
