-- ── Cross-campaign battle linking ────────────────────────────────────────────
-- Adds source_battle_id to battles so that a battle logged in one campaign can
-- be "also recorded" in a second campaign.  The linked copy is a full battles
-- row with the second campaign's factions and territory; source_battle_id points
-- back to the original.  ON DELETE SET NULL means deleting the original just
-- clears the pointer without removing the copy.

ALTER TABLE battles
  ADD COLUMN IF NOT EXISTS source_battle_id UUID
    REFERENCES battles(id) ON DELETE SET NULL;

-- Index for the "linked battles" lookup on the original battle's detail page
CREATE INDEX IF NOT EXISTS idx_battles_source_battle_id
  ON battles (source_battle_id)
  WHERE source_battle_id IS NOT NULL;

-- Note: no RLS changes needed — linked battles are full battles rows and
-- inherit the existing battle RLS (public read, co-owner edit/delete).
