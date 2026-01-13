-- Description: Extract phase/section/subsection into a normalized 'categories' table
-- Author: Antigravity AI

-- 0. Cleanup (Safe for re-run during development)
DROP TABLE IF EXISTS categories CASCADE;
ALTER TABLE works DROP COLUMN IF EXISTS category_id;

-- 1. Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- Compatible with uuid-ossp
  parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('work', 'material')) DEFAULT 'work',
  tenant_id UUID REFERENCES tenants(id),
  is_global BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure uniqueness for siblings
  UNIQUE(parent_id, name, tenant_id, is_global)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_categories_tenant ON categories(tenant_id);

-- 2. Add category_id to works
ALTER TABLE works ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);
CREATE INDEX IF NOT EXISTS idx_works_category ON works(category_id);

-- 3. Populate Level 1 (Phases) - ROOT
INSERT INTO categories (name, type, is_global, tenant_id)
SELECT DISTINCT phase, 'work', is_global, tenant_id 
FROM works 
WHERE phase IS NOT NULL AND phase != ''
ON CONFLICT (parent_id, name, tenant_id, is_global) DO NOTHING;

-- 4. Populate Level 2 (Sections) - Children of Phases
INSERT INTO categories (name, parent_id, type, is_global, tenant_id)
SELECT DISTINCT w.section, p.id, 'work', w.is_global, w.tenant_id
FROM works w
JOIN categories p ON p.name = w.phase 
                  AND p.parent_id IS NULL
                  AND (p.tenant_id = w.tenant_id OR (p.tenant_id IS NULL AND w.tenant_id IS NULL))
                  AND p.is_global = w.is_global
WHERE w.section IS NOT NULL AND w.section != ''
ON CONFLICT (parent_id, name, tenant_id, is_global) DO NOTHING;

-- 5. Populate Level 3 (Subsections) - Children of Sections
INSERT INTO categories (name, parent_id, type, is_global, tenant_id)
SELECT DISTINCT w.subsection, s.id, 'work', w.is_global, w.tenant_id
FROM works w
JOIN categories p ON p.name = w.phase AND p.parent_id IS NULL 
                  AND (p.tenant_id = w.tenant_id OR (p.tenant_id IS NULL AND w.tenant_id IS NULL))
                  AND p.is_global = w.is_global
JOIN categories s ON s.name = w.section AND s.parent_id = p.id
                  AND (s.tenant_id = w.tenant_id OR (s.tenant_id IS NULL AND w.tenant_id IS NULL))
                  AND s.is_global = w.is_global
WHERE w.subsection IS NOT NULL AND w.subsection != ''
ON CONFLICT (parent_id, name, tenant_id, is_global) DO NOTHING;

-- 6. Link Works to Categories
-- Case A: Work has Subsection (Level 3)
UPDATE works w
SET category_id = c.id
FROM categories c
JOIN categories s ON s.id = c.parent_id
JOIN categories p ON p.id = s.parent_id
WHERE w.subsection = c.name 
  AND w.section = s.name 
  AND w.phase = p.name
  AND (w.tenant_id = c.tenant_id OR (w.tenant_id IS NULL AND c.tenant_id IS NULL))
  AND w.is_global = c.is_global
  AND w.category_id IS NULL;

-- Case B: Work has Section but NO Subsection (Level 2)
UPDATE works w
SET category_id = s.id
FROM categories s
JOIN categories p ON p.id = s.parent_id
WHERE (w.subsection IS NULL OR w.subsection = '')
  AND w.section = s.name 
  AND w.phase = p.name
  AND (w.tenant_id = s.tenant_id OR (w.tenant_id IS NULL AND s.tenant_id IS NULL))
  AND w.is_global = s.is_global
  AND w.category_id IS NULL;

-- Case C: Work has Phase but NO Section/Subsection (Level 1)
UPDATE works w
SET category_id = p.id
FROM categories p
WHERE (w.subsection IS NULL OR w.subsection = '')
  AND (w.section IS NULL OR w.section = '')
  AND w.phase = p.name
  AND (w.tenant_id = p.tenant_id OR (w.tenant_id IS NULL AND p.tenant_id IS NULL))
  AND w.is_global = p.is_global
  AND w.category_id IS NULL;

-- Note: We do NOT remove old columns yet to preserve backward compatibility.
