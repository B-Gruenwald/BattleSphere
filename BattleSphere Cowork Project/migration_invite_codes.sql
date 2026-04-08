-- Migration: Fix campaign invite system
-- Run the entire script in the Supabase SQL editor.
-- Safe to run multiple times (uses IF NOT EXISTS / DO blocks).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Allow authenticated users to read all campaigns
--
--    Without this, logged-in users who are NOT yet members of a campaign
--    cannot read the campaign row at all (RLS returns nothing). This broke:
--      • The public campaign page for logged-in non-members
--      • The invite link join page (campaign lookup returned null)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'campaigns'
      AND policyname = 'Authenticated users can read campaigns'
  ) THEN
    CREATE POLICY "Authenticated users can read campaigns"
      ON campaigns FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Create campaign_invite_codes table
--
--    Replaces the single invite_code column on campaigns with a dedicated
--    table. Organisers can now create multiple invite links simultaneously;
--    each link expires independently (default 7 days) and can be revoked
--    individually without affecting the others.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_invite_codes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  code        TEXT        NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days'
);

ALTER TABLE campaign_invite_codes ENABLE ROW LEVEL SECURITY;

-- Organisers can create, view, and delete their own campaign's invite codes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'campaign_invite_codes'
      AND policyname = 'Organiser can manage invite codes'
  ) THEN
    CREATE POLICY "Organiser can manage invite codes"
      ON campaign_invite_codes FOR ALL
      TO authenticated
      USING (
        campaign_id IN (SELECT id FROM campaigns WHERE organiser_id = auth.uid())
      )
      WITH CHECK (
        campaign_id IN (SELECT id FROM campaigns WHERE organiser_id = auth.uid())
      );
  END IF;
END $$;

-- Anyone (including unauthenticated visitors) can look up a code to validate it
-- (security comes from the length + randomness of the code, not from hiding it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'campaign_invite_codes'
      AND policyname = 'Anyone can look up invite codes'
  ) THEN
    CREATE POLICY "Anyone can look up invite codes"
      ON campaign_invite_codes FOR SELECT
      USING (true);
  END IF;
END $$;
