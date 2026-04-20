-- ─────────────────────────────────────────────────────────────────────────────
-- League Format Migration
-- Adds campaign_format column to campaigns table.
-- Existing campaigns default to 'narrative' (all current behaviour preserved).
--
-- Run once in the Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS campaign_format TEXT NOT NULL DEFAULT 'narrative';

-- Confirm: 'narrative' = full map/territory/events system (existing behaviour)
--          'league'    = no map, no territories, no events; league table standings
