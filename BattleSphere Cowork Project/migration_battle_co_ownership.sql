-- ============================================================
-- Battle Co-Ownership: allow attacker & defender to edit
-- ============================================================
-- Run this in the Supabase SQL editor.
--
-- Previously only the `logged_by` user could update a battle.
-- This migration extends the UPDATE policy so that:
--   • the player who logged it (logged_by)
--   • the attacker player (attacker_player_id)
--   • the defender player (defender_player_id)
--   • the campaign organiser
-- can all edit a battle record.
-- ============================================================

-- Step 1: Drop any existing UPDATE policies on the battles table.
-- Several names were used across earlier schema versions — drop them all.
DROP POLICY IF EXISTS "Campaign members can update battles"    ON battles;
DROP POLICY IF EXISTS "Users can update their own battles"     ON battles;
DROP POLICY IF EXISTS "Battle owners can update"              ON battles;
DROP POLICY IF EXISTS "logged_by can update battles"          ON battles;
DROP POLICY IF EXISTS "Battle co-owners can update battles"   ON battles;

-- Step 2: Create the new co-ownership UPDATE policy.
CREATE POLICY "Battle co-owners can update battles" ON battles
FOR UPDATE
USING (
  auth.uid() = logged_by
  OR auth.uid() = attacker_player_id
  OR auth.uid() = defender_player_id
  OR auth.uid() = (
    SELECT organiser_id FROM campaigns WHERE id = battles.campaign_id
  )
)
WITH CHECK (
  auth.uid() = logged_by
  OR auth.uid() = attacker_player_id
  OR auth.uid() = defender_player_id
  OR auth.uid() = (
    SELECT organiser_id FROM campaigns WHERE id = battles.campaign_id
  )
);
