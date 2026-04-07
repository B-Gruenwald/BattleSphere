-- Migration: Allow campaign members to update their own faction_id
-- Run this in the Supabase SQL Editor for your project.
--
-- The faction save was silently failing because campaign_members had no
-- UPDATE policy permitting authenticated users to modify their own row.

CREATE POLICY "members_update_own_faction"
  ON campaign_members
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
