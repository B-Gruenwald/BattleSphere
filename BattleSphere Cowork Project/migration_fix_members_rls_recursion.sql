-- ============================================================
-- FIX: Infinite recursion in campaign_members RLS policies
-- ============================================================
--
-- Root cause:
--   The INSERT policy "organisers_insert_members" contains a
--   sub-query that reads campaign_members to check for an
--   organiser/admin role:
--
--     EXISTS (SELECT 1 FROM campaign_members cm2 WHERE …)
--
--   When Postgres evaluates this nested read, it applies the
--   SELECT policies on campaign_members, one of which calls
--   is_campaign_member() — which in turn reads campaign_members
--   again. The result is infinite recursion.
--
--   Additionally, "Members can view campaign members" (SELECT)
--   is redundant: "Authenticated users can read campaign_members"
--   already grants all authenticated users full read access via
--   USING(true). Keeping both means the potentially recursive
--   is_campaign_member() path is always evaluated unnecessarily.
--
-- Fix:
--   1. Create is_campaign_organiser_or_admin() as SECURITY DEFINER
--      so its inner query on campaign_members bypasses RLS entirely.
--   2. Drop the redundant "Members can view campaign members" SELECT
--      policy so is_campaign_member() is never called during reads.
--   3. Rebuild organisers_insert_members using the new definer fn.
--   4. Rebuild organisers_delete_members using the new definer fn.
--
-- Safe to re-run (uses CREATE OR REPLACE / DROP IF EXISTS).
-- ============================================================


-- ── 1. Security-definer helper ────────────────────────────────────────────────
--   Queries campaign_members without triggering RLS, so it can be used
--   safely inside other RLS policies on campaign_members itself.

CREATE OR REPLACE FUNCTION public.is_campaign_organiser_or_admin(p_campaign_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM campaign_members
    WHERE campaign_id = p_campaign_id
      AND user_id     = auth.uid()
      AND role        IN ('organiser', 'admin', 'Organiser')
  );
$$;


-- ── 2. Drop redundant recursive SELECT policy ─────────────────────────────────
--   "Authenticated users can read campaign_members" (USING true) already
--   covers all authenticated reads — this one is redundant and causes the
--   recursion chain via is_campaign_member().

DROP POLICY IF EXISTS "Members can view campaign members" ON campaign_members;


-- ── 3. Rebuild INSERT policy ──────────────────────────────────────────────────
--   Three allowed cases:
--     a) Primary campaign organiser adding any player
--     b) Organiser/admin member adding any player  ← uses definer fn, no loop
--     c) Any user inserting themselves (self-join via invite link)

DROP POLICY IF EXISTS "organisers_insert_members" ON campaign_members;

CREATE POLICY "organisers_insert_members" ON campaign_members
  FOR INSERT WITH CHECK (
    -- (a) Primary organiser
    EXISTS (
      SELECT 1 FROM campaigns
       WHERE id           = campaign_members.campaign_id
         AND organiser_id = auth.uid()
    )
    -- (b) Organiser/admin member — security-definer call, no RLS recursion
    OR public.is_campaign_organiser_or_admin(campaign_members.campaign_id)
    -- (c) User joining themselves via invite link
    OR auth.uid() = campaign_members.user_id
  );


-- ── 4. Rebuild DELETE policy ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "organisers_delete_members" ON campaign_members;

CREATE POLICY "organisers_delete_members" ON campaign_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM campaigns
       WHERE id           = campaign_members.campaign_id
         AND organiser_id = auth.uid()
    )
    OR public.is_campaign_organiser_or_admin(campaign_members.campaign_id)
  );


-- ── Done ──────────────────────────────────────────────────────────────────────
-- After running this, invite-link joins will work for newly registered
-- accounts. The organiser add-player and remove-player flows are unchanged.
