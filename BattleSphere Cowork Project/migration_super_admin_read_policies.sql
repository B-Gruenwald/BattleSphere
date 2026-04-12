-- ─────────────────────────────────────────────────────────────────────────
-- Super-Admin Read Policies
-- Lets the super-admin account read all data across every campaign,
-- including campaigns they are not a member of.
--
-- Run ONCE in the Supabase SQL Editor.
-- Requires migration_super_admin.sql to have been run first.
-- ─────────────────────────────────────────────────────────────────────────

-- ── 1. Helper function ────────────────────────────────────────────────────
-- SECURITY DEFINER bypasses RLS when checking the profiles table,
-- preventing a circular dependency (policy → profiles → policy...).
-- Same pattern as the existing is_campaign_member() function.

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$;


-- ── 2. campaigns ─────────────────────────────────────────────────────────
CREATE POLICY "super_admin_read_all_campaigns"
  ON campaigns
  FOR SELECT
  USING (public.is_super_admin());


-- ── 3. factions ──────────────────────────────────────────────────────────
CREATE POLICY "super_admin_read_all_factions"
  ON factions
  FOR SELECT
  USING (public.is_super_admin());


-- ── 4. territories ───────────────────────────────────────────────────────
CREATE POLICY "super_admin_read_all_territories"
  ON territories
  FOR SELECT
  USING (public.is_super_admin());


-- ── 5. campaign_members ───────────────────────────────────────────────────
CREATE POLICY "super_admin_read_all_members"
  ON campaign_members
  FOR SELECT
  USING (public.is_super_admin());


-- ── 6. battles ───────────────────────────────────────────────────────────
CREATE POLICY "super_admin_read_all_battles"
  ON battles
  FOR SELECT
  USING (public.is_super_admin());


-- ── 7. territory_influence ────────────────────────────────────────────────
CREATE POLICY "super_admin_read_all_influence"
  ON territory_influence
  FOR SELECT
  USING (public.is_super_admin());


-- ── 8. campaign_events ────────────────────────────────────────────────────
CREATE POLICY "super_admin_read_all_events"
  ON campaign_events
  FOR SELECT
  USING (public.is_super_admin());


-- ── 9. achievements ───────────────────────────────────────────────────────
CREATE POLICY "super_admin_read_all_achievements"
  ON achievements
  FOR SELECT
  USING (public.is_super_admin());


-- ── 10. profiles (all user profiles, not just your own) ───────────────────
-- The is_super_admin() function uses SECURITY DEFINER so there is no
-- circular loop here — it reads profiles without going through RLS.
CREATE POLICY "super_admin_read_all_profiles"
  ON profiles
  FOR SELECT
  USING (public.is_super_admin());


-- ── 11. join_requests (only if the table already exists) ──────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'join_requests'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "super_admin_read_all_join_requests"
        ON join_requests
        FOR SELECT
        USING (public.is_super_admin())
    $policy$;
    RAISE NOTICE 'join_requests policy created.';
  ELSE
    RAISE NOTICE 'join_requests table not found — skipping. Run migration_public_access.sql first, then re-run this line manually.';
  END IF;
END $$;
