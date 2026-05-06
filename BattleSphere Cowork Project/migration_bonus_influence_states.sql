-- Migration: Add bonus_influence_states condition to campaign_events
-- Run this in the Supabase SQL editor for your BattleSphere project.

ALTER TABLE campaign_events
  ADD COLUMN IF NOT EXISTS bonus_influence_states TEXT[] DEFAULT NULL;

COMMENT ON COLUMN campaign_events.bonus_influence_states IS
  'Optional influence-state condition for the Tier 2 event bonus. '
  'Allowed values: ''neutral'', ''winner_dominant'', ''winner_not_dominant''. '
  'NULL means "any state". OR logic within the array (any one matching state triggers the bonus). '
  'AND logic with the other bonus_ condition columns.';
