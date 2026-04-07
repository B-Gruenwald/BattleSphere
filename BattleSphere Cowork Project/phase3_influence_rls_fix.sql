-- ============================================================
-- PHASE 3 FIX: territory_influence RLS policy fix
-- Run this in: Supabase → SQL Editor → New Query
-- (Run AFTER the original phase3_influence_migration.sql)
-- ============================================================

-- Drop the old policies (may fail with "does not exist" — that's fine)
DROP POLICY IF EXISTS "Campaign members can read influence"  ON territory_influence;
DROP POLICY IF EXISTS "Organiser can insert influence"       ON territory_influence;
DROP POLICY IF EXISTS "Organiser can update influence"       ON territory_influence;
DROP POLICY IF EXISTS "Organiser can delete influence"       ON territory_influence;

-- Create a single clean policy: any campaign member can do anything
-- (matches the pattern used on battles and other tables in this app)
CREATE POLICY "Members can manage influence"
  ON territory_influence
  FOR ALL
  USING  (public.is_campaign_member(campaign_id))
  WITH CHECK (public.is_campaign_member(campaign_id));

-- ============================================================
-- DONE. The territory_influence table now allows any campaign
-- member to read and write influence records.
-- ============================================================
