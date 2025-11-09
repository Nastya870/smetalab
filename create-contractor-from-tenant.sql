-- Создание контрагента ООО Смета Лаб на основе данных tenant
-- Этот контрагент будет использоваться как Подрядчик по умолчанию

INSERT INTO counterparties (
  tenant_id,
  entity_type,
  company_name,
  inn,
  ogrn,
  kpp,
  legal_address,
  actual_address,
  bank_account,
  correspondent_account,
  bank_bik,
  bank_name,
  director_name,
  accountant_name,
  created_by,
  updated_by
)
SELECT 
  id as tenant_id,
  'legal' as entity_type,
  company_full_name as company_name,
  inn,
  ogrn,
  kpp,
  legal_address,
  actual_address,
  bank_account,
  correspondent_account,
  bank_bik,
  bank_name,
  director_name,
  accountant_name,
  (SELECT id FROM users WHERE tenant_id = tenants.id LIMIT 1) as created_by,
  (SELECT id FROM users WHERE tenant_id = tenants.id LIMIT 1) as updated_by
FROM tenants
WHERE id = '4eded664-27ac-4d7f-a9d8-f8340751ceab'
ON CONFLICT (tenant_id, inn) 
DO UPDATE SET
  company_name = EXCLUDED.company_name,
  ogrn = EXCLUDED.ogrn,
  kpp = EXCLUDED.kpp,
  legal_address = EXCLUDED.legal_address,
  actual_address = EXCLUDED.actual_address,
  bank_account = EXCLUDED.bank_account,
  correspondent_account = EXCLUDED.correspondent_account,
  bank_bik = EXCLUDED.bank_bik,
  bank_name = EXCLUDED.bank_name,
  director_name = EXCLUDED.director_name,
  accountant_name = EXCLUDED.accountant_name,
  updated_by = EXCLUDED.updated_by,
  updated_at = NOW();

-- Проверка созданного контрагента
SELECT 
  id,
  company_name,
  inn,
  ogrn,
  kpp,
  director_name,
  legal_address
FROM counterparties
WHERE tenant_id = '4eded664-27ac-4d7f-a9d8-f8340751ceab'
  AND entity_type = 'legal'
  AND company_name ILIKE '%смета%лаб%';
