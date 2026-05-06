-- ═══════════════════════════════════════════════════════════════════════════
-- BattleSphere — Fix: public campaign page blank standings for logged-out visitors
--
-- Root cause: three tables queried by /campaign/[slug] have no anon SELECT
-- policy, so RLS silently returns empty rows for logged-out visitors.
-- This causes the League Table, Player Standings, Chronicle weekly updates,
-- and campaign map (warp routes) to appear empty.
--
-- Tables fixed:
--   1. campaign_members     — drives all player/standings lists
--   2. chronicle_weekly_updates — weekly hobby/crusade reports in Chronicle
--   3. warp_routes          — map connections on the campaign page
--
-- Safe to run more than once (IF NOT EXISTS guards).
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN

  -- 1. campaign_members — anon read (public campaign page needs player lists)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'campaign_members'
      AND policyname = 'public_read_campaign_members'
  ) THEN
    CREATE POLICY "public_read_campaign_members"
      ON campaign_members FOR SELECT TO anon USING (true);
  END IF;

  -- 2. chronicle_weekly_updates — anon read (Chronicle on public page)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chronicle_weekly_updates'
      AND policyname = 'public_read_chronicle_weekly_updates'
  ) THEN
    CREATE POLICY "public_read_chronicle_weekly_updates"
      ON chronicle_weekly_updates FOR SELECT TO anon USING (true);
  END IF;

  -- 3. warp_routes — anon read (campaign map on public page)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'warp_routes'
      AND policyname = 'public_read_warp_routes'
  ) THEN
    CREATE POLICY "public_read_warp_routes"
      ON warp_routes FOR SELECT TO anon USING (true);
  END IF;

END $$;
