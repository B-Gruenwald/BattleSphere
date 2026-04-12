-- ============================================================
-- Comprehensive RLS fix: extend all organiser-only write policies
-- to also include campaign_members with role 'organiser' or 'admin'
-- ============================================================
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
--
-- Background: policies created before role-based organisers were
-- introduced only checked campaigns.organiser_id = auth.uid().
-- This migration replaces every such policy with a version that
-- also accepts members whose role is 'organiser' or 'admin'.
--
-- Safe to re-run: all DROPs use IF EXISTS.
-- territories was fixed separately (migration_territory_organiser_rls.sql).
-- warp_routes already had the role check — not touched here.
-- ============================================================

-- ── Shared helper comment ─────────────────────────────────────────────────────
-- The role check used throughout:
--
--   OR EXISTS (
--     SELECT 1 FROM campaign_members
--      WHERE campaign_id = <table>.campaign_id
--        AND user_id = auth.uid()
--        AND role IN ('organiser', 'admin', 'Organiser')
--   )
--
-- 'Organiser' (capital O) is included for legacy rows created before
-- the app standardised on lowercase.
-- ═════════════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════════════
-- 1. TERRITORY INFLUENCE
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Organiser can insert influence"         ON territory_influence;
DROP POLICY IF EXISTS "Organiser can update influence"         ON territory_influence;
DROP POLICY IF EXISTS "Organiser can delete influence"         ON territory_influence;
DROP POLICY IF EXISTS "organisers_insert_influence"            ON territory_influence;
DROP POLICY IF EXISTS "organisers_update_influence"            ON territory_influence;
DROP POLICY IF EXISTS "organisers_delete_influence"            ON territory_influence;

CREATE POLICY "organisers_insert_influence" ON territory_influence
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
       WHERE id = territory_influence.campaign_id
         AND organiser_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM campaign_members
       WHERE campaign_id = territory_influence.campaign_id
         AND user_id = auth.uid()
         AND role IN ('organiser', 'admin', 'Organiser')
    )
  );

CREATE POLICY "organisers_update_influence" ON territory_influence
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
       WHERE id = territory_influence.campaign_id
         AND organiser_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM campaign_members
       WHERE campaign_id = territory_influence.campaign_id
         AND user_id = auth.uid()
         AND role IN ('organiser', 'admin', 'Organiser')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
       WHERE id = territory_influence.campaign_id
         AND organiser_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM campaign_members
       WHERE campaign_id = territory_influence.campaign_id
         AND user_id = auth.uid()
         AND role IN ('organiser', 'admin', 'Organiser')
    )
  );

CREATE POLICY "organisers_delete_influence" ON territory_influence
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM campaigns
       WHERE id = territory_influence.campaign_id
         AND organiser_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM campaign_members
       WHERE campaign_id = territory_influence.campaign_id
         AND user_id = auth.uid()
         AND role IN ('organiser', 'admin', 'Organiser')
    )
  );


-- ══════════════════════════════════════════════════════════════════════════════
-- 2. CAMPAIGN EVENTS
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Organiser can create events"  ON campaign_events;
DROP POLICY IF EXISTS "Organiser can update events"  ON campaign_events;
DROP POLICY IF EXISTS "Organiser can delete events"  ON campaign_events;

CREATE POLICY "organisers_insert_events" ON campaign_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
       WHERE id = campaign_events.campaign_id
         AND organiser_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM campaign_members
       WHERE campaign_id = campaign_events.campaign_id
         AND user_id = auth.uid()
         AND role IN ('organiser', 'admin', 'Organiser')
    )
  );

CREATE POLICY "organisers_update_events" ON campaign_events
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
       WHERE id = campaign_events.campaign_id
         AND organiser_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM campaign_members
       WHERE campaign_id = campaign_events.campaign_id
         AND user_id = auth.uid()
         AND role IN ('organiser', 'admin', 'Organiser')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
       WHERE id = campaign_events.campaign_id
         AND organiser_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM campaign_members
       WHERE campaign_id = campaign_events.campaign_id
         AND user_id = auth.uid()
         AND role IN ('organiser', 'admin', 'Organiser')
    )
  );

CREATE POLICY "organisers_delete_events" ON campaign_events
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM campaigns
       WHERE id = campaign_events.campaign_id
         AND organiser_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM campaign_members
       WHERE campaign_id = campaign_events.campaign_id
         AND user_id = auth.uid()
         AND role IN ('organiser', 'admin', 'Organiser')
    )
  );


-- ══════════════════════════════════════════════════════════════════════════════
-- 3. ACHIEVEMENTS
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Organiser can create achievements"  ON achievements;
DROP POLICY IF EXISTS "Organiser can delete achievements"  ON achievements;

CREATE POLICY "organisers_insert_achievements" ON achievements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
       WHERE id = achievements.campaign_id
         AND organiser_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM campaign_members
       WHERE campaign_id = achievements.campaign_id
         AND user_id = auth.uid()
         AND role IN ('organiser', 'admin', 'Organiser')
    )
  );

CREATE POLICY "organisers_delete_achievements" ON achievements
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM campaigns
       WHERE id = achievements.campaign_id
         AND organiser_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM campaign_members
       WHERE campaign_id = achievements.campaign_id
         AND user_id = auth.uid()
         AND role IN ('organiser', 'admin', 'Organiser')
    )
  );


-- ══════════════════════════════════════════════════════════════════════════════
-- 4. BATTLES — UPDATE and DELETE co-ownership
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Battle co-owners can update battles"  ON battles;
DROP POLICY IF EXISTS "battles_delete_co_owner"              ON battles;

CREATE POLICY "Battle co-owners can update battles" ON battles
  FOR UPDATE
  USING (
    auth.uid() = logged_by
    OR auth.uid() = attacker_player_id
    OR auth.uid() = defender_player_id
    OR auth.uid() = (SELECT organiser_id FROM campaigns WHERE id = battles.campaign_id)
    OR EXISTS (
      SELECT 1 FROM campaign_members
       WHERE campaign_id = battles.campaign_id
         AND user_id = auth.uid()
         AND role IN ('organiser', 'admin', 'Organiser')
    )
  )
  WITH CHECK (
    auth.uid() = logged_by
    OR auth.uid() = attacker_player_id
    OR auth.uid() = defender_player_id
    OR auth.uid() = (SELECT organiser_id FROM campaigns WHERE id = battles.campaign_id)
    OR EXISTS (
      SELECT 1 FROM campaign_members
       WHERE campaign_id = battles.campaign_id
         AND user_id = auth.uid()
         AND role IN ('organiser', 'admin', 'Organiser')
    )
  );

CREATE POLICY "battles_delete_co_owner" ON battles
  FOR DELETE USING (
    auth.uid() = logged_by
    OR auth.uid() = attacker_player_id
    OR auth.uid() = defender_player_id
    OR auth.uid() IN (SELECT organiser_id FROM campaigns WHERE id = campaign_id)
    OR EXISTS (
      SELECT 1 FROM campaign_members
       WHERE campaign_id = battles.campaign_id
         AND user_id = auth.uid()
         AND role IN ('organiser', 'admin', 'Organiser')
    )
  );


-- ══════════════════════════════════════════════════════════════════════════════
-- 5. CAMPAIGN MEMBERS — organiser add / remove players
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Organiser can add members"     ON campaign_members;
DROP POLICY IF EXISTS "Organiser can remove members"  ON campaign_members;

CREATE POLICY "organisers_insert_members" ON campaign_members
  FOR INSERT WITH CHECK (
    -- Organiser/admin adding a player on their behalf
    EXISTS (
      SELECT 1 FROM campaigns
       WHERE id = campaign_members.campaign_id
         AND organiser_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM campaign_members cm2
       WHERE cm2.campaign_id = campaign_members.campaign_id
         AND cm2.user_id = auth.uid()
         AND cm2.role IN ('organiser', 'admin', 'Organiser')
    )
    -- Self-join via invite (user adding themselves)
    OR auth.uid() = campaign_members.user_id
  );

CREATE POLICY "organisers_delete_members" ON campaign_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM campaigns
       WHERE id = campaign_members.campaign_id
         AND organiser_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM campaign_members cm2
       WHERE cm2.campaign_id = campaign_members.campaign_id
         AND cm2.user_id = auth.uid()
         AND cm2.role IN ('organiser', 'admin', 'Organiser')
    )
  );


-- ══════════════════════════════════════════════════════════════════════════════
-- 6. CAMPAIGN INVITE CODES
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Organiser can manage invite codes"  ON campaign_invite_codes;

CREATE POLICY "organisers_manage_invite_codes" ON campaign_invite_codes
  FOR ALL
  USING (
    campaign_id IN (SELECT id FROM campaigns WHERE organiser_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM campaign_members
       WHERE campaign_id = campaign_invite_codes.campaign_id
         AND user_id = auth.uid()
         AND role IN ('organiser', 'admin', 'Organiser')
    )
  )
  WITH CHECK (
    campaign_id IN (SELECT id FROM campaigns WHERE organiser_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM campaign_members
       WHERE campaign_id = campaign_invite_codes.campaign_id
         AND user_id = auth.uid()
         AND role IN ('organiser', 'admin', 'Organiser')
    )
  );


-- ══════════════════════════════════════════════════════════════════════════════
-- 7. FACTIONS — name and colour editing
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Organiser can update factions"  ON factions;

CREATE POLICY "organisers_update_factions" ON factions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
       WHERE id = factions.campaign_id
         AND organiser_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM campaign_members
       WHERE campaign_id = factions.campaign_id
         AND user_id = auth.uid()
         AND role IN ('organiser', 'admin', 'Organiser')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
       WHERE id = factions.campaign_id
         AND organiser_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM campaign_members
       WHERE campaign_id = factions.campaign_id
         AND user_id = auth.uid()
         AND role IN ('organiser', 'admin', 'Organiser')
    )
  );


-- ══════════════════════════════════════════════════════════════════════════════
-- 8. CAMPAIGNS — settings editing (name, description, visibility, etc.)
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Organiser can update campaign"  ON campaigns;

CREATE POLICY "organisers_update_campaign" ON campaigns
  FOR UPDATE
  USING (
    organiser_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM campaign_members
       WHERE campaign_id = campaigns.id
         AND user_id = auth.uid()
         AND role IN ('organiser', 'admin', 'Organiser')
    )
  )
  WITH CHECK (
    organiser_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM campaign_members
       WHERE campaign_id = campaigns.id
         AND user_id = auth.uid()
         AND role IN ('organiser', 'admin', 'Organiser')
    )
  );
