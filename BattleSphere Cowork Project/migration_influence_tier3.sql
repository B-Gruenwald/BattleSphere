-- ============================================================
-- Influence Tier 3: Territory Cascade
-- Run in Supabase SQL editor
-- ============================================================

-- 1. Add cascade configuration columns to campaign_events.
--    cascade_territory_id — the top-level territory that triggers the cascade.
--    cascade_bonus        — flat influence awarded to the winning faction in each
--                          territory directly connected by a route to cascade_territory_id.
ALTER TABLE campaign_events
  ADD COLUMN IF NOT EXISTS cascade_bonus        INTEGER,
  ADD COLUMN IF NOT EXISTS cascade_territory_id UUID REFERENCES territories(id) ON DELETE SET NULL;

-- 2. Audit table: one row per connected territory that received cascade influence.
--    Separate from battle_event_bonuses because:
--      • Multiple rows per battle+event are needed (one per connected territory).
--      • Only the winning faction is affected (not both factions).
--      • Reversal logic differs from Tier 2.
CREATE TABLE IF NOT EXISTS battle_cascade_bonuses (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id    UUID        NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  event_id     UUID        NOT NULL REFERENCES campaign_events(id) ON DELETE CASCADE,
  territory_id UUID        NOT NULL REFERENCES territories(id) ON DELETE CASCADE,
  faction_id   UUID        NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
  bonus_amount INTEGER     NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (battle_id, event_id, territory_id)
);

-- RLS: campaign members can read; only service role writes (via API routes)
ALTER TABLE battle_cascade_bonuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view battle cascade bonuses"
  ON battle_cascade_bonuses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM battles b
      JOIN campaign_members cm ON cm.campaign_id = b.campaign_id
      WHERE b.id = battle_cascade_bonuses.battle_id
        AND cm.user_id = auth.uid()
    )
  );
