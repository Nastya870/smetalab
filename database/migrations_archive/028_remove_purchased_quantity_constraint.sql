-- =====================================================
-- Migration: Remove purchased_quantity constraint
-- Description: Разрешить закупку материалов больше чем в смете (уход в минус/перерасход)
-- Created: 2025-10-27
-- Version: 028
-- Reason: Не всегда можно точно учесть материал в смете, нужна возможность перерасхода
-- =====================================================

-- Удаляем constraint, который запрещает purchased_quantity > quantity
ALTER TABLE purchases 
DROP CONSTRAINT IF EXISTS check_purchased_not_exceeds_quantity;

-- Добавляем комментарий
COMMENT ON COLUMN purchases.purchased_quantity IS 
'Фактически закупленное количество материала. МОЖЕТ быть больше quantity (перерасход для доп. оплаты клиенту)';

-- Информация о миграции
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 028 completed successfully';
  RAISE NOTICE '   - Removed constraint: check_purchased_not_exceeds_quantity';
  RAISE NOTICE '   - Теперь можно закупить больше материала чем в смете';
  RAISE NOTICE '   - Перерасход будет формировать списки для доп. оплаты';
END $$;
