-- Migration 012: Create work_materials table for work-material relationships
-- This table stores which materials are used in each work and their consumption rates

-- Create work_materials table
CREATE TABLE IF NOT EXISTS work_materials (
  id SERIAL PRIMARY KEY,
  work_id INTEGER NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  consumption DECIMAL(10, 4) NOT NULL DEFAULT 1.0, -- Расход материала на единицу работы
  is_required BOOLEAN DEFAULT true, -- Обязательный материал или нет
  notes TEXT, -- Примечания
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  CONSTRAINT unique_work_material_per_tenant UNIQUE(work_id, material_id, tenant_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_work_materials_work_id ON work_materials(work_id);
CREATE INDEX IF NOT EXISTS idx_work_materials_material_id ON work_materials(material_id);
CREATE INDEX IF NOT EXISTS idx_work_materials_tenant_id ON work_materials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_work_materials_composite ON work_materials(work_id, tenant_id);

-- Add RLS (Row Level Security) policies
ALTER TABLE work_materials ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see work_materials from their tenant
CREATE POLICY work_materials_tenant_isolation ON work_materials
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

-- Add comment
COMMENT ON TABLE work_materials IS 'Связи между работами и материалами с указанием расхода';
COMMENT ON COLUMN work_materials.consumption IS 'Расход материала на 1 единицу работы (например, 0.5 л топлива на 1 м³)';
COMMENT ON COLUMN work_materials.is_required IS 'Обязательный материал (true) или опциональный (false)';
