-- migration_unit_portrait.sql
-- Adds is_portrait flag to army_unit_photos.
-- One photo per unit can be marked as the portrait; all others default to false.
-- Run once in Supabase SQL editor.

ALTER TABLE army_unit_photos
  ADD COLUMN IF NOT EXISTS is_portrait BOOLEAN NOT NULL DEFAULT false;
