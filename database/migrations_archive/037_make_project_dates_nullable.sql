-- Migration 037: Make project start_date and end_date nullable
-- Date: 2025-01-29
-- Purpose: Allow creating projects without specifying dates initially

-- Make start_date nullable
ALTER TABLE projects 
ALTER COLUMN start_date DROP NOT NULL;

-- Make end_date nullable
ALTER TABLE projects 
ALTER COLUMN end_date DROP NOT NULL;

-- Drop the CHECK constraint that requires end_date >= start_date
-- since we need to allow NULL values
ALTER TABLE projects 
DROP CONSTRAINT IF EXISTS valid_dates;

-- Add new CHECK constraint that allows NULLs but validates when both dates are present
ALTER TABLE projects
ADD CONSTRAINT valid_dates 
CHECK (
  (start_date IS NULL OR end_date IS NULL) OR 
  (end_date >= start_date)
);

-- Update the actual_end_date constraint to handle NULL start_date
ALTER TABLE projects 
DROP CONSTRAINT IF EXISTS valid_actual_end_date;

ALTER TABLE projects
ADD CONSTRAINT valid_actual_end_date 
CHECK (
  actual_end_date IS NULL OR 
  start_date IS NULL OR 
  actual_end_date >= start_date
);

-- Add comment explaining the nullable dates
COMMENT ON COLUMN projects.start_date IS 'Дата начала работ (необязательное поле)';
COMMENT ON COLUMN projects.end_date IS 'Дата окончания работ (необязательное поле)';
