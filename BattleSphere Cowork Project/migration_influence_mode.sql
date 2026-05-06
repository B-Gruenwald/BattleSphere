-- Migration: Add influence_mode to campaigns
-- Values: 'standard' (default) | 'victory' | 'off'
--   standard : Win → winner +3, loser +1 · Draw → both +2
--   victory  : Win → winner +1 only · Draw and loss award nothing
--   off      : No automatic influence; organiser manages manually

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS influence_mode text NOT NULL DEFAULT 'standard';
