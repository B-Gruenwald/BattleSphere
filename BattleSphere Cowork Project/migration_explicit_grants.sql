-- ═══════════════════════════════════════════════════════════════════════════════
-- BattleSphere: Explicit grants for all public schema tables
-- ═══════════════════════════════════════════════════════════════════════════════
-- Why: Supabase is removing the auto-grant default for new tables from May 30
-- (new projects) and October 30, 2026 (all projects). This migration makes all
-- existing grants explicit so nothing breaks at that rollout.
--
-- Safe to run at any time — GRANT is idempotent (no error if already granted).
-- Run in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════


-- ── Tables readable by the public (anon + authenticated + service_role) ───────
-- These tables have public-read RLS policies for anon visitors.

GRANT SELECT                       ON public.profiles                TO anon;
GRANT SELECT, INSERT, UPDATE       ON public.profiles                TO authenticated;
GRANT ALL                          ON public.profiles                TO service_role;

GRANT SELECT                       ON public.campaigns               TO anon;
GRANT SELECT, INSERT, UPDATE       ON public.campaigns               TO authenticated;
GRANT ALL                          ON public.campaigns               TO service_role;

GRANT SELECT                       ON public.factions                TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.factions              TO authenticated;
GRANT ALL                          ON public.factions                TO service_role;

GRANT SELECT                       ON public.territories             TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.territories           TO authenticated;
GRANT ALL                          ON public.territories             TO service_role;

GRANT SELECT                       ON public.battles                 TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.battles               TO authenticated;
GRANT ALL                          ON public.battles                 TO service_role;

GRANT SELECT                       ON public.territory_influence     TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.territory_influence   TO authenticated;
GRANT ALL                          ON public.territory_influence     TO service_role;

GRANT SELECT                       ON public.campaign_events         TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_events       TO authenticated;
GRANT ALL                          ON public.campaign_events         TO service_role;

GRANT SELECT                       ON public.achievements            TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.achievements          TO authenticated;
GRANT ALL                          ON public.achievements            TO service_role;

GRANT SELECT                       ON public.campaign_members        TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_members      TO authenticated;
GRANT ALL                          ON public.campaign_members        TO service_role;

GRANT SELECT                       ON public.warp_routes             TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.warp_routes           TO authenticated;
GRANT ALL                          ON public.warp_routes             TO service_role;

GRANT SELECT                       ON public.armies                  TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.armies                TO authenticated;
GRANT ALL                          ON public.armies                  TO service_role;

GRANT SELECT                       ON public.army_units              TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.army_units            TO authenticated;
GRANT ALL                          ON public.army_units              TO service_role;

GRANT SELECT                       ON public.army_unit_photos        TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.army_unit_photos      TO authenticated;
GRANT ALL                          ON public.army_unit_photos        TO service_role;

GRANT SELECT                       ON public.battle_photos           TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.battle_photos         TO authenticated;
GRANT ALL                          ON public.battle_photos           TO service_role;

GRANT SELECT                       ON public.battle_event_bonuses    TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.battle_event_bonuses  TO authenticated;
GRANT ALL                          ON public.battle_event_bonuses    TO service_role;

GRANT SELECT                       ON public.battle_cascade_bonuses  TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.battle_cascade_bonuses TO authenticated;
GRANT ALL                          ON public.battle_cascade_bonuses  TO service_role;

GRANT SELECT                       ON public.crusade_unit_records    TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crusade_unit_records  TO authenticated;
GRANT ALL                          ON public.crusade_unit_records    TO service_role;

GRANT SELECT                       ON public.campaign_army_records   TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_army_records TO authenticated;
GRANT ALL                          ON public.campaign_army_records   TO service_role;

GRANT SELECT                       ON public.bulletin_dispatches     TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bulletin_dispatches   TO authenticated;
GRANT ALL                          ON public.bulletin_dispatches     TO service_role;

GRANT SELECT                       ON public.platform_announcements  TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_announcements TO authenticated;
GRANT ALL                          ON public.platform_announcements  TO service_role;


-- ── Tables restricted to authenticated users only (no anon access) ────────────
-- RLS policies on these tables already block access; no anon grant needed.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.join_requests         TO authenticated;
GRANT ALL                            ON public.join_requests         TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_invite_codes TO authenticated;
GRANT ALL                            ON public.campaign_invite_codes TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_digest_messages TO authenticated;
GRANT ALL                            ON public.campaign_digest_messages TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chronicle_weekly_updates TO authenticated;
GRANT ALL                            ON public.chronicle_weekly_updates TO service_role;

GRANT SELECT, INSERT, UPDATE         ON public.user_notifications    TO authenticated;
GRANT ALL                            ON public.user_notifications    TO service_role;


-- ═══════════════════════════════════════════════════════════════════════════════
-- TEMPLATE: copy this block whenever you create a new table in future migrations
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- For a PUBLIC table (anon can read):
--
--   GRANT SELECT                         ON public.your_table TO anon;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON public.your_table TO authenticated;
--   GRANT ALL                            ON public.your_table TO service_role;
--
-- For a PRIVATE table (authenticated users only):
--
--   GRANT SELECT, INSERT, UPDATE, DELETE ON public.your_table TO authenticated;
--   GRANT ALL                            ON public.your_table TO service_role;
--
-- Always pair with:
--   ALTER TABLE public.your_table ENABLE ROW LEVEL SECURITY;
--   CREATE POLICY ... ON public.your_table ...;
-- ═══════════════════════════════════════════════════════════════════════════════
