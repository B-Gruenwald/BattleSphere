-- ============================================================
-- MIGRATION: Campaign Admin — Invite Code + Member RLS
-- Run this in: Supabase → SQL Editor → New Query
-- ============================================================

-- 1. Add invite_code column to campaigns
--    (unique short code used to generate a shareable join link)
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- ============================================================
-- 2. RLS policies for campaign_members
--    (allows organiser to add/remove players directly)
-- ============================================================

-- Allow organiser to insert any member into their campaign
-- (needed for "Add Player by username" feature)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'campaign_members'
      AND policyname = 'Organiser can add members'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Organiser can add members"
        ON campaign_members FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM campaigns
            WHERE campaigns.id = campaign_members.campaign_id
              AND campaigns.organiser_id = auth.uid()
          )
        )
    $policy$;
  END IF;
END $$;

-- Allow users to insert themselves (self-join via invite link)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'campaign_members'
      AND policyname = 'Users can self-join via invite'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Users can self-join via invite"
        ON campaign_members FOR INSERT
        WITH CHECK (
          user_id = auth.uid()
        )
    $policy$;
  END IF;
END $$;

-- Allow organiser to delete any member from their campaign
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'campaign_members'
      AND policyname = 'Organiser can remove members'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Organiser can remove members"
        ON campaign_members FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM campaigns
            WHERE campaigns.id = campaign_members.campaign_id
              AND campaigns.organiser_id = auth.uid()
          )
        )
    $policy$;
  END IF;
END $$;

-- Allow authenticated users to read all profiles
-- (needed for username search when adding players)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
      AND policyname = 'Authenticated users can read profiles'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Authenticated users can read profiles"
        ON profiles FOR SELECT
        USING (auth.role() = 'authenticated')
    $policy$;
  END IF;
END $$;

-- Allow organiser to update their campaign (settings)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'campaigns'
      AND policyname = 'Organiser can update campaign'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Organiser can update campaign"
        ON campaigns FOR UPDATE
        USING (organiser_id = auth.uid())
    $policy$;
  END IF;
END $$;

-- Allow organiser to update factions in their campaigns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'factions'
      AND policyname = 'Organiser can update factions'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Organiser can update factions"
        ON factions FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM campaigns
            WHERE campaigns.id = factions.campaign_id
              AND campaigns.organiser_id = auth.uid()
          )
        )
    $policy$;
  END IF;
END $$;

-- ============================================================
-- DONE. After running, the Admin page will be able to:
--   · Save campaign settings (name, description, setting)
--   · Add players by username
--   · Remove players from the campaign
--   · Generate and use invite links (join via /join/[code])
--   · Edit faction names and colours
-- ============================================================
