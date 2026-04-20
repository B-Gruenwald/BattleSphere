-- ============================================================
-- FIX: Home Game League — two post-seed corrections
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================
-- What this does:
--   1. Adds the campaign_format column (if not done yet)
--   2. Sets home-game-league-anpa6 to campaign_format = 'league'
--   3. Moves the 3 hobby_progress chronicle entries to March/April
--      dates so they appear near the top of the Chronicle timeline
--      alongside the Crusade Report entries.
-- ============================================================

-- ── 1. Ensure column exists (safe to run even if already done) ─
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS campaign_format TEXT NOT NULL DEFAULT 'narrative';

-- ── 2. Mark the demo campaign as league format ─────────────────
UPDATE campaigns
   SET campaign_format = 'league'
 WHERE slug = 'home-game-league-anpa6';

-- ── 3. Shift hobby_progress entries to March 2026 ──────────────
-- They currently have week_end in February, which pushes them below
-- 24 battles in the newest-first timeline. Moving to March makes
-- them visible alongside the Crusade Report entries.

-- Catch-up entry: move to week of 24 Feb → 1 Mar
UPDATE chronicle_weekly_updates
   SET week_start = '2026-02-24 00:00:00+00',
       week_end   = '2026-03-01 23:59:59+00'
 WHERE id = 'e1000001-0000-0000-0000-000000000000';

-- Hobby entry 2: move to week of 3–9 Mar
UPDATE chronicle_weekly_updates
   SET week_start = '2026-03-03 00:00:00+00',
       week_end   = '2026-03-09 23:59:59+00'
 WHERE id = 'e1000002-0000-0000-0000-000000000000';

-- Hobby entry 3: move to week of 17–23 Mar
UPDATE chronicle_weekly_updates
   SET week_start = '2026-03-17 00:00:00+00',
       week_end   = '2026-03-23 23:59:59+00'
 WHERE id = 'e1000003-0000-0000-0000-000000000000';

-- ── Verify ─────────────────────────────────────────────────────
SELECT
  campaign_format,
  (SELECT count(*) FROM chronicle_weekly_updates cu
     WHERE cu.campaign_id = campaigns.id) AS chronicle_entries,
  (SELECT count(*) FROM chronicle_weekly_updates cu
     WHERE cu.campaign_id = campaigns.id
       AND cu.update_type = 'hobby_progress') AS hobby_entries,
  (SELECT count(*) FROM chronicle_weekly_updates cu
     WHERE cu.campaign_id = campaigns.id
       AND cu.update_type = 'army_progress') AS crusade_entries
FROM campaigns
WHERE slug = 'home-game-league-anpa6';
-- Expected: campaign_format=league, chronicle_entries=5, hobby=3, crusade=2
