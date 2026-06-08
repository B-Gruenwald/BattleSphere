-- Migration: allow campaign-free battles
-- Run this in the Supabase SQL editor

-- 1. Make campaign_id optional so battles can exist without a campaign
ALTER TABLE battles ALTER COLUMN campaign_id DROP NOT NULL;

-- 2. Add winner_player_id for recording the winner of no-campaign battles
--    (campaign battles use winner_faction_id instead)
ALTER TABLE battles ADD COLUMN IF NOT EXISTS winner_player_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
