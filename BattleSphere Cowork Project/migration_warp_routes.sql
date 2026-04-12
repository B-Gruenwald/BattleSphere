-- ── Warp Routes ─────────────────────────────────────────────────────────────
-- Stores the network of connections between top-level territories on the campaign map.
-- Each row represents a bidirectional edge. territory_a is always lexicographically
-- ≤ territory_b to avoid duplicates (enforced by app code + UNIQUE constraint).

CREATE TABLE IF NOT EXISTS warp_routes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  territory_a uuid NOT NULL REFERENCES territories(id) ON DELETE CASCADE,
  territory_b uuid NOT NULL REFERENCES territories(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (campaign_id, territory_a, territory_b)
);

ALTER TABLE warp_routes ENABLE ROW LEVEL SECURITY;

-- Campaign members (and the organiser) can read routes
CREATE POLICY "members_read_warp_routes" ON warp_routes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaign_members
      WHERE campaign_id = warp_routes.campaign_id
        AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM campaigns
      WHERE id = warp_routes.campaign_id
        AND visibility = 'Public'
    )
  );

-- Organisers / admins can insert, update, delete
CREATE POLICY "organisers_manage_warp_routes" ON warp_routes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE id = warp_routes.campaign_id
        AND organiser_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM campaign_members
      WHERE campaign_id = warp_routes.campaign_id
        AND user_id = auth.uid()
        AND role IN ('Organiser', 'admin', 'organiser')
    )
  );

-- Super admin read (uses the SECURITY DEFINER function from migration_super_admin_read_policies.sql)
CREATE POLICY "super_admin_read_warp_routes" ON warp_routes
  FOR SELECT USING (public.is_super_admin());
