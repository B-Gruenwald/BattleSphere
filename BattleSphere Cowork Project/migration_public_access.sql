-- ═══════════════════════════════════════════════════════════════════════════════
-- BattleSphere: Public access RLS policies + join_requests table
-- Run in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Public (anon) read policies ───────────────────────────────────────────────
-- Allows unauthenticated visitors to view campaign data on public pages.
-- These policies grant the anon role read-only SELECT access to these tables.

CREATE POLICY "public_read_campaigns"
  ON campaigns FOR SELECT TO anon USING (true);

CREATE POLICY "public_read_factions"
  ON factions FOR SELECT TO anon USING (true);

CREATE POLICY "public_read_territories"
  ON territories FOR SELECT TO anon USING (true);

CREATE POLICY "public_read_battles"
  ON battles FOR SELECT TO anon USING (true);

CREATE POLICY "public_read_campaign_events"
  ON campaign_events FOR SELECT TO anon USING (true);

CREATE POLICY "public_read_achievements"
  ON achievements FOR SELECT TO anon USING (true);

CREATE POLICY "public_read_territory_influence"
  ON territory_influence FOR SELECT TO anon USING (true);

CREATE POLICY "public_read_profiles"
  ON profiles FOR SELECT TO anon USING (true);

-- ── join_requests table ───────────────────────────────────────────────────────
-- Stores requests from users who want to join a campaign.
-- Organiser reviews and approves/rejects each request.

CREATE TABLE IF NOT EXISTS public.join_requests (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
  message     text,
  status      text        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at  timestamptz DEFAULT now(),
  UNIQUE (campaign_id, user_id)
);

ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own request (one per campaign)
CREATE POLICY "users_insert_own_request" ON join_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own requests (to check pending/rejected status)
CREATE POLICY "users_read_own_requests" ON join_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Organisers can read all requests for campaigns they own
CREATE POLICY "organiser_read_requests" ON join_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = join_requests.campaign_id
        AND campaigns.organiser_id = auth.uid()
    )
  );

-- Organisers can update (approve/reject) requests for their campaigns
CREATE POLICY "organiser_update_requests" ON join_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = join_requests.campaign_id
        AND campaigns.organiser_id = auth.uid()
    )
  )
  WITH CHECK (true);
