-- Migration: Add indexes for all high-frequency query columns
-- Every table previously had only the default primary key index (id).
-- These cover the WHERE / IN / ORDER BY columns used on every page load.
-- Run in Supabase SQL editor.

-- ── battles ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_battles_campaign_id
  ON public.battles (campaign_id);

CREATE INDEX IF NOT EXISTS idx_battles_territory_id
  ON public.battles (territory_id);

CREATE INDEX IF NOT EXISTS idx_battles_attacker_faction_id
  ON public.battles (attacker_faction_id);

CREATE INDEX IF NOT EXISTS idx_battles_defender_faction_id
  ON public.battles (defender_faction_id);

CREATE INDEX IF NOT EXISTS idx_battles_winner_faction_id
  ON public.battles (winner_faction_id);

CREATE INDEX IF NOT EXISTS idx_battles_attacker_player_id
  ON public.battles (attacker_player_id);

CREATE INDEX IF NOT EXISTS idx_battles_defender_player_id
  ON public.battles (defender_player_id);

CREATE INDEX IF NOT EXISTS idx_battles_campaign_created
  ON public.battles (campaign_id, created_at DESC);

-- ── territory_influence ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_territory_influence_campaign_id
  ON public.territory_influence (campaign_id);

CREATE INDEX IF NOT EXISTS idx_territory_influence_territory_id
  ON public.territory_influence (territory_id);

CREATE INDEX IF NOT EXISTS idx_territory_influence_faction_id
  ON public.territory_influence (faction_id);

-- ── territories ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_territories_campaign_id
  ON public.territories (campaign_id);

CREATE INDEX IF NOT EXISTS idx_territories_parent_id
  ON public.territories (parent_id);

CREATE INDEX IF NOT EXISTS idx_territories_controlling_faction_id
  ON public.territories (controlling_faction_id);

-- ── factions ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_factions_campaign_id
  ON public.factions (campaign_id);

-- ── campaign_members ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_campaign_members_campaign_id
  ON public.campaign_members (campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_members_user_id
  ON public.campaign_members (user_id);

CREATE INDEX IF NOT EXISTS idx_campaign_members_faction_id
  ON public.campaign_members (faction_id);

-- ── campaign_events ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_campaign_events_campaign_id
  ON public.campaign_events (campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_events_status
  ON public.campaign_events (status);

CREATE INDEX IF NOT EXISTS idx_campaign_events_campaign_status
  ON public.campaign_events (campaign_id, status);

-- ── warp_routes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_warp_routes_campaign_id
  ON public.warp_routes (campaign_id);

CREATE INDEX IF NOT EXISTS idx_warp_routes_territory_a
  ON public.warp_routes (territory_a);

CREATE INDEX IF NOT EXISTS idx_warp_routes_territory_b
  ON public.warp_routes (territory_b);

-- ── achievements ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_achievements_campaign_id
  ON public.achievements (campaign_id);

CREATE INDEX IF NOT EXISTS idx_achievements_faction_id
  ON public.achievements (awarded_to_faction_id);

-- ── army_units ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_army_units_army_id
  ON public.army_units (army_id);

-- ── army_unit_photos ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_army_unit_photos_unit_id
  ON public.army_unit_photos (unit_id);

-- ── armies ────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_armies_player_id
  ON public.armies (player_id);

CREATE INDEX IF NOT EXISTS idx_armies_is_public
  ON public.armies (is_public);

-- ── crusade_unit_records ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_crusade_unit_records_army_unit_id
  ON public.crusade_unit_records (army_unit_id);

CREATE INDEX IF NOT EXISTS idx_crusade_unit_records_car_id
  ON public.crusade_unit_records (campaign_army_record_id);

-- ── campaign_army_records ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_campaign_army_records_campaign_id
  ON public.campaign_army_records (campaign_id);

-- ── battle_event_bonuses ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_battle_event_bonuses_battle_id
  ON public.battle_event_bonuses (battle_id);

-- ── battle_cascade_bonuses ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_battle_cascade_bonuses_battle_id
  ON public.battle_cascade_bonuses (battle_id);

-- ── faction_photos ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_faction_photos_faction_id
  ON public.faction_photos (faction_id);

-- ── user_notifications ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id
  ON public.user_notifications (user_id);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_read
  ON public.user_notifications (user_id, is_read);

-- ── profiles ─────────────────────────────────────────────────────────────────
-- last_digest_sent_at used by the cron job to find users due for a digest
CREATE INDEX IF NOT EXISTS idx_profiles_last_digest_sent_at
  ON public.profiles (last_digest_sent_at);

-- ── campaigns ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_campaigns_slug
  ON public.campaigns (slug);

CREATE INDEX IF NOT EXISTS idx_campaigns_organiser_id
  ON public.campaigns (organiser_id);
