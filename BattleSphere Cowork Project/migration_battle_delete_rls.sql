-- Migration: Allow co-owners and organisers to DELETE battle records
-- Run this in the Supabase SQL Editor

-- Drop the policy if it already exists (safe to re-run)
DROP POLICY IF EXISTS "battles_delete_co_owner" ON battles;

-- Co-owners (logger, attacker, defender) and the campaign organiser
-- can delete a battle record.
CREATE POLICY "battles_delete_co_owner" ON battles
FOR DELETE
USING (
  auth.uid() = logged_by
  OR auth.uid() = attacker_player_id
  OR auth.uid() = defender_player_id
  OR auth.uid() IN (
    SELECT organiser_id FROM campaigns WHERE id = campaign_id
  )
);
