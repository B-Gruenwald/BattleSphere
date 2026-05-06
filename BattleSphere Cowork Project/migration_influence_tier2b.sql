-- ============================================================
-- Influence Tier 2b: Upgrade bonus conditions to arrays
-- Replaces single-value columns with array columns so organisers
-- can select multiple territories / battle types / factions per event.
-- Run AFTER migration_influence_tier2.sql has been executed.
-- ============================================================

ALTER TABLE campaign_events
  DROP COLUMN IF EXISTS bonus_territory_id,
  DROP COLUMN IF EXISTS bonus_battle_type,
  DROP COLUMN IF EXISTS bonus_faction_id,
  ADD COLUMN IF NOT EXISTS bonus_territory_ids  UUID[],
  ADD COLUMN IF NOT EXISTS bonus_battle_types   TEXT[],
  ADD COLUMN IF NOT EXISTS bonus_faction_ids    UUID[];
