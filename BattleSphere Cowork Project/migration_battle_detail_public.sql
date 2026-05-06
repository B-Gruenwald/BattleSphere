-- ============================================================
-- Make battle detail pages publicly readable
-- Run in Supabase SQL editor
-- ============================================================
-- battles, factions, territories, profiles, campaign_events,
-- and campaigns already have anon read policies from
-- migration_public_access.sql. This migration covers the three
-- tables that were missing:

-- 1. Battle photos — allows anonymous visitors to view photos
--    on a shared battle detail link.
CREATE POLICY "public_read_battle_photos"
  ON battle_photos FOR SELECT TO anon USING (true);

-- 2. Battle event bonuses (Tier 2) — allows anonymous visitors
--    to see the influence/XP bonus chip on the battle page.
CREATE POLICY "public_read_battle_event_bonuses"
  ON battle_event_bonuses FOR SELECT TO anon USING (true);

-- 3. Battle cascade bonuses (Tier 3) — allows anonymous visitors
--    to see the territory cascade breakdown on the battle page.
CREATE POLICY "public_read_battle_cascade_bonuses"
  ON battle_cascade_bonuses FOR SELECT TO anon USING (true);
