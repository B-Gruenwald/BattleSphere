-- Migration: Allow authenticated users to read all public campaign data
--
-- The public campaign page (/campaign/[slug]) is intentionally public.
-- Supabase RLS was allowing anon (logged-out) reads on these tables but
-- blocking authenticated users who are not yet members of the campaign.
-- This migration adds the missing SELECT policies for the authenticated role.
--
-- Safe to run multiple times (all wrapped in IF NOT EXISTS checks).

-- Helper macro to avoid repetition
DO $$
DECLARE
  tbl TEXT;
BEGIN
  -- factions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'factions' AND policyname = 'Authenticated users can read factions') THEN
    CREATE POLICY "Authenticated users can read factions"
      ON factions FOR SELECT TO authenticated USING (true);
  END IF;

  -- territories
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'territories' AND policyname = 'Authenticated users can read territories') THEN
    CREATE POLICY "Authenticated users can read territories"
      ON territories FOR SELECT TO authenticated USING (true);
  END IF;

  -- battles
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'battles' AND policyname = 'Authenticated users can read battles') THEN
    CREATE POLICY "Authenticated users can read battles"
      ON battles FOR SELECT TO authenticated USING (true);
  END IF;

  -- territory_influence
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'territory_influence' AND policyname = 'Authenticated users can read territory_influence') THEN
    CREATE POLICY "Authenticated users can read territory_influence"
      ON territory_influence FOR SELECT TO authenticated USING (true);
  END IF;

  -- campaign_events
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'campaign_events' AND policyname = 'Authenticated users can read campaign_events') THEN
    CREATE POLICY "Authenticated users can read campaign_events"
      ON campaign_events FOR SELECT TO authenticated USING (true);
  END IF;

  -- achievements
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'achievements' AND policyname = 'Authenticated users can read achievements') THEN
    CREATE POLICY "Authenticated users can read achievements"
      ON achievements FOR SELECT TO authenticated USING (true);
  END IF;

  -- campaign_members (needed for the player count on the public page)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'campaign_members' AND policyname = 'Authenticated users can read campaign_members') THEN
    CREATE POLICY "Authenticated users can read campaign_members"
      ON campaign_members FOR SELECT TO authenticated USING (true);
  END IF;

  -- profiles (needed for achievement recipient names on the public page)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Authenticated users can read profiles') THEN
    CREATE POLICY "Authenticated users can read profiles"
      ON profiles FOR SELECT TO authenticated USING (true);
  END IF;

END $$;
