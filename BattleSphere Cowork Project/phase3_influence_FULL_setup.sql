-- ============================================================
-- PHASE 3: Territorial Influence — Full Setup (run this only)
-- Supabase → SQL Editor → New Query → paste → Run
-- This replaces both previous SQL files. Run this once.
-- ============================================================

-- 1. Create the territory_influence table
CREATE TABLE IF NOT EXISTS territory_influence (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  territory_id UUID REFERENCES territories(id) ON DELETE CASCADE NOT NULL,
  faction_id UUID REFERENCES factions(id) ON DELETE CASCADE NOT NULL,
  influence_points INTEGER DEFAULT 0 NOT NULL CHECK (influence_points >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(territory_id, faction_id)
);

-- 2. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_territory_influence_territory ON territory_influence(territory_id);
CREATE INDEX IF NOT EXISTS idx_territory_influence_faction   ON territory_influence(faction_id);
CREATE INDEX IF NOT EXISTS idx_territory_influence_campaign  ON territory_influence(campaign_id);

-- 3. Enable Row Level Security
ALTER TABLE territory_influence ENABLE ROW LEVEL SECURITY;

-- 4. Single clean policy: any campaign member can read and write
CREATE POLICY "Members can manage influence"
  ON territory_influence
  FOR ALL
  USING  (public.is_campaign_member(campaign_id))
  WITH CHECK (public.is_campaign_member(campaign_id));

-- ============================================================
-- Done! You should now see territory_influence in Table Editor.
-- ============================================================
