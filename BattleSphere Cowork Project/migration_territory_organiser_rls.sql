-- ============================================================
-- Territory RLS: extend write access to role-based organisers
-- ============================================================
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
--
-- Previously, territory INSERT / UPDATE / DELETE was only allowed
-- for the campaign creator (organiser_id on the campaigns table).
-- This migration extends all three policies so that campaign_members
-- with role 'organiser' or 'admin' have the same write rights.
-- ============================================================

-- ── DROP existing write policies ──────────────────────────────────────────────
-- Several names may have been used across schema versions — drop them all safely.
DROP POLICY IF EXISTS "Organisers can insert territories"        ON territories;
DROP POLICY IF EXISTS "Organisers can update territories"        ON territories;
DROP POLICY IF EXISTS "Organisers can delete territories"        ON territories;
DROP POLICY IF EXISTS "Campaign organisers can insert territories" ON territories;
DROP POLICY IF EXISTS "Campaign organisers can update territories" ON territories;
DROP POLICY IF EXISTS "Campaign organisers can delete territories" ON territories;
DROP POLICY IF EXISTS "organisers_manage_territories"            ON territories;
DROP POLICY IF EXISTS "members_manage_territories"               ON territories;
-- also drop the names created by this script itself (safe to re-run)
DROP POLICY IF EXISTS "organisers_insert_territories"            ON territories;
DROP POLICY IF EXISTS "organisers_update_territories"            ON territories;
DROP POLICY IF EXISTS "organisers_delete_territories"            ON territories;

-- ── Shared condition (used in USING + WITH CHECK for each policy) ─────────────
-- True if the current user is:
--   a) the campaign creator (organiser_id), OR
--   b) a campaign_member with role 'organiser' or 'admin'

-- ── INSERT ────────────────────────────────────────────────────────────────────
CREATE POLICY "organisers_insert_territories" ON territories
  FOR INSERT
  WITH CHECK (
    auth.uid() = (
      SELECT organiser_id FROM campaigns WHERE id = territories.campaign_id
    )
    OR EXISTS (
      SELECT 1 FROM campaign_members
       WHERE campaign_id = territories.campaign_id
         AND user_id     = auth.uid()
         AND role        IN ('organiser', 'admin')
    )
  );

-- ── UPDATE ────────────────────────────────────────────────────────────────────
CREATE POLICY "organisers_update_territories" ON territories
  FOR UPDATE
  USING (
    auth.uid() = (
      SELECT organiser_id FROM campaigns WHERE id = territories.campaign_id
    )
    OR EXISTS (
      SELECT 1 FROM campaign_members
       WHERE campaign_id = territories.campaign_id
         AND user_id     = auth.uid()
         AND role        IN ('organiser', 'admin')
    )
  )
  WITH CHECK (
    auth.uid() = (
      SELECT organiser_id FROM campaigns WHERE id = territories.campaign_id
    )
    OR EXISTS (
      SELECT 1 FROM campaign_members
       WHERE campaign_id = territories.campaign_id
         AND user_id     = auth.uid()
         AND role        IN ('organiser', 'admin')
    )
  );

-- ── DELETE ────────────────────────────────────────────────────────────────────
CREATE POLICY "organisers_delete_territories" ON territories
  FOR DELETE
  USING (
    auth.uid() = (
      SELECT organiser_id FROM campaigns WHERE id = territories.campaign_id
    )
    OR EXISTS (
      SELECT 1 FROM campaign_members
       WHERE campaign_id = territories.campaign_id
         AND user_id     = auth.uid()
         AND role        IN ('organiser', 'admin')
    )
  );
