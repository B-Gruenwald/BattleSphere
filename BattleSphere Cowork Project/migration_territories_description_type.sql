-- ============================================================
-- MIGRATION: Add description + type columns to territories
-- Run this in: Supabase → SQL Editor → New Query
-- ============================================================

-- Add 'type' column (e.g. "Hive City", "Wasteland", "Forge World")
ALTER TABLE territories
  ADD COLUMN IF NOT EXISTS type TEXT;

-- Add 'description' column (free-text, optional)
ALTER TABLE territories
  ADD COLUMN IF NOT EXISTS description TEXT;

-- ============================================================
-- DONE. The Map Edit page will now be able to save these fields
-- without throwing a schema cache error.
-- ============================================================
