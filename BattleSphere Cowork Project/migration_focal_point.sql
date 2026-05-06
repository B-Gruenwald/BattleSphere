-- migration_focal_point.sql
-- Adds focal_point control to unit photos, battle photos, and territory images.
-- Values: 'top' | 'center' | 'bottom'  (maps to CSS object-position)
-- Run once in Supabase SQL editor.

ALTER TABLE army_unit_photos
  ADD COLUMN IF NOT EXISTS focal_point VARCHAR NOT NULL DEFAULT 'center';

ALTER TABLE battle_photos
  ADD COLUMN IF NOT EXISTS focal_point VARCHAR NOT NULL DEFAULT 'center';

ALTER TABLE territories
  ADD COLUMN IF NOT EXISTS image_focal_point VARCHAR NOT NULL DEFAULT 'center';
