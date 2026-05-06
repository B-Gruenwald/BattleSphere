-- ============================================================
-- Influence Tier 2: Event-linked influence bonuses
-- Run in Supabase SQL editor
-- ============================================================

-- 1. Add bonus configuration columns to campaign_events
--    Arrays: multiple values per condition = OR within that condition type
--    AND logic across condition types (territory AND battle_type AND faction)
ALTER TABLE campaign_events
  ADD COLUMN IF NOT EXISTS influence_bonus      INTEGER,
  ADD COLUMN IF NOT EXISTS bonus_territory_ids  UUID[],
  ADD COLUMN IF NOT EXISTS bonus_battle_types   TEXT[],
  ADD COLUMN IF NOT EXISTS bonus_faction_ids    UUID[];

-- 2. Add event XP bonus to battles (flat amount earned via event; same for both players)
ALTER TABLE battles
  ADD COLUMN IF NOT EXISTS event_xp_bonus INTEGER NOT NULL DEFAULT 0;

-- 3. Audit table: tracks which events applied a bonus to which battle (enables clean reversal)
CREATE TABLE IF NOT EXISTS battle_event_bonuses (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id     UUID        NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  event_id      UUID        NOT NULL REFERENCES campaign_events(id) ON DELETE CASCADE,
  bonus_amount  INTEGER     NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (battle_id, event_id)
);

-- RLS: members of the campaign can read; only service role writes (via API routes)
ALTER TABLE battle_event_bonuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view battle event bonuses"
  ON battle_event_bonuses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM battles b
      JOIN campaign_members cm ON cm.campaign_id = b.campaign_id
      WHERE b.id = battle_event_bonuses.battle_id
        AND cm.user_id = auth.uid()
    )
  );
