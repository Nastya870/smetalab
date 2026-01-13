-- Additional updates for remaining works

-- Отделочные работы (04-xxx) - обновляем по точному коду
UPDATE works 
SET 
  phase = 'Отделочные работы',
  section = 'Внутренняя отделка',
  subsection = 'Штукатурные работы'
WHERE code = '04-001';

UPDATE works 
SET 
  phase = 'Отделочные работы',
  section = 'Внутренняя отделка',
  subsection = 'Облицовка'
WHERE code = '04-002';

UPDATE works 
SET 
  phase = 'Отделочные работы',
  section = 'Внутренняя отделка',
  subsection = 'Окраска'
WHERE code = '04-003';

-- Тестовые работы - можно удалить или оставить без иерархии
UPDATE works 
SET 
  phase = 'Основные строительные работы',
  section = 'Бетонные работы',
  subsection = 'Разное'
WHERE code IN ('1', '222');

UPDATE works 
SET 
  phase = 'Основные строительные работы',
  section = 'Каменные работы',
  subsection = 'Разное'
WHERE code = '323';

-- Проверка
SELECT code, name, phase, section, subsection
FROM works
ORDER BY code;
