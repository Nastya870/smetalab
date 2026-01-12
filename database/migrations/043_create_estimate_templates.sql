-- Migration: Create estimate templates tables
-- Description: Add support for estimate templates (tenant-level)
-- Author: System
-- Date: 2025-11-17

-- ====================================
-- Таблица шаблонов смет
-- ====================================
CREATE TABLE IF NOT EXISTS estimate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT estimate_templates_name_tenant_unique UNIQUE (tenant_id, name)
);

-- Индексы для estimate_templates
CREATE INDEX IF NOT EXISTS idx_estimate_templates_tenant_id ON estimate_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_estimate_templates_category ON estimate_templates(category);
CREATE INDEX IF NOT EXISTS idx_estimate_templates_created_by ON estimate_templates(created_by);

-- ====================================
-- Таблица работ в шаблонах
-- ====================================
CREATE TABLE IF NOT EXISTS estimate_template_works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES estimate_templates(id) ON DELETE CASCADE,
  work_id INTEGER NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  phase VARCHAR(100),
  section VARCHAR(100),
  subsection VARCHAR(100),
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Индексы для estimate_template_works
CREATE INDEX IF NOT EXISTS idx_estimate_template_works_template_id ON estimate_template_works(template_id);
CREATE INDEX IF NOT EXISTS idx_estimate_template_works_work_id ON estimate_template_works(work_id);
CREATE INDEX IF NOT EXISTS idx_estimate_template_works_sort_order ON estimate_template_works(template_id, sort_order);

-- ====================================
-- Таблица материалов в шаблонах
-- ====================================
CREATE TABLE IF NOT EXISTS estimate_template_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES estimate_templates(id) ON DELETE CASCADE,
  material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Индексы для estimate_template_materials
CREATE INDEX IF NOT EXISTS idx_estimate_template_materials_template_id ON estimate_template_materials(template_id);
CREATE INDEX IF NOT EXISTS idx_estimate_template_materials_material_id ON estimate_template_materials(material_id);
CREATE INDEX IF NOT EXISTS idx_estimate_template_materials_sort_order ON estimate_template_materials(template_id, sort_order);

-- ====================================
-- Комментарии к таблицам
-- ====================================
COMMENT ON TABLE estimate_templates IS 'Шаблоны смет для быстрого создания типовых смет';
COMMENT ON TABLE estimate_template_works IS 'Работы, входящие в шаблон сметы';
COMMENT ON TABLE estimate_template_materials IS 'Материалы, входящие в шаблон сметы';

COMMENT ON COLUMN estimate_templates.name IS 'Название шаблона (например: "Шаблон: Ремонт квартиры")';
COMMENT ON COLUMN estimate_templates.category IS 'Категория шаблона (например: "Квартиры", "Офисы")';
COMMENT ON COLUMN estimate_template_works.quantity IS 'Количество работ по умолчанию в шаблоне';
COMMENT ON COLUMN estimate_template_materials.quantity IS 'Количество материалов по умолчанию в шаблоне';
COMMENT ON COLUMN estimate_template_works.sort_order IS 'Порядок сортировки работ в шаблоне';
COMMENT ON COLUMN estimate_template_materials.sort_order IS 'Порядок сортировки материалов в шаблоне';
