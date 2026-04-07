-- ============================================================
-- MIGRATION: Allow campaign members to read the full member list
-- Run this in: Supabase → SQL Editor → New Query
-- ============================================================
--
-- The campaign_members table had no SELECT policy, so RLS was
-- blocking non-organisers from seeing anyone but themselves.
-- This policy allows any member of a campaign to read all
-- other members of that same campaign.
-- ============================================================

CREATE POLICY "Members can view campaign members"
  ON campaign_members FOR SELECT
  USING (public.is_campaign_member(campaign_id));
