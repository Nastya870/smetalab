-- =====================================================
-- Migration: Add purchased_quantity to purchases table
-- Description: Добавление поля для отслеживания закупленного количества
-- Created: 2025-10-26
-- Version: 024
-- =====================================================

-- Добавляем поле для отслеживания закупленного количества
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS purchased_quantity DECIMAL(15, 4) DEFAULT 0;

-- Ограничение: нельзя закупить больше чем нужно
ALTER TABLE purchases
ADD CONSTRAINT check_purchased_not_exceeds_quantity 
CHECK (purchased_quantity <= quantity);

-- Индекс для быстрого поиска закупок с остатками
CREATE INDEX idx_purchases_with_remainder ON purchases(estimate_id)
WHERE (quantity - purchased_quantity) > 0;

-- Комментарий
COMMENT ON COLUMN purchases.purchased_quantity IS 'Уже закупленное количество материала (суммируется из global_purchases)';
