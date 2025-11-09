/**
 * Миграция 027: Добавление колонки is_extra_charge в таблицу purchases
 * Для поддержки материалов "Отдельный чек" (О/Ч)
 */

export const up = async (db) => {
  console.log('🔄 Миграция 027: Добавление is_extra_charge в purchases...');

  // Добавляем колонку is_extra_charge
  await db.query(`
    ALTER TABLE purchases 
    ADD COLUMN IF NOT EXISTS is_extra_charge BOOLEAN DEFAULT false;
  `);

  console.log('✅ Колонка is_extra_charge добавлена');

  // Создаем индекс для быстрой фильтрации О/Ч материалов
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_purchases_is_extra_charge 
    ON purchases(tenant_id, estimate_id, is_extra_charge) 
    WHERE is_extra_charge = true;
  `);

  console.log('✅ Индекс для is_extra_charge создан');
  console.log('✅ Миграция 027 завершена успешно');
};

export const down = async (db) => {
  console.log('🔄 Откат миграции 027...');

  // Удаляем индекс
  await db.query(`
    DROP INDEX IF EXISTS idx_purchases_is_extra_charge;
  `);

  // Удаляем колонку
  await db.query(`
    ALTER TABLE purchases 
    DROP COLUMN IF EXISTS is_extra_charge;
  `);

  console.log('✅ Откат миграции 027 завершен');
};
