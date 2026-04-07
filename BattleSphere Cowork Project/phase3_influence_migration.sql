-- ============================================================
-- PHASE 3: Influence System — Supabase Migration
-- Run this in: Supabase → SQL Editor → New Query
-- ============================================================

-- 1. Create the territory_influence table
-- Tracks each faction's influence score in each territory
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

-- 2. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_territory_influence_territory ON territory_influence(territory_id);
CREATE INDEX IF NOT EXISTS idx_territory_influence_faction ON territory_influence(faction_id);
CREATE INDEX IF NOT EXISTS idx_territory_influence_campaign ON territory_influence(campaign_id);

-- 3. Enable Row Level Security
ALTER TABLE territory_influence ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies (mirrors the pattern used on other tables)

-- Anyone in the campaign can read influence data
CREATE POLICY "Campaign members can read influence"
  ON territory_influence FOR SELECT
  USING (public.is_campaign_member(campaign_id));

-- Only the campaign organiser can insert/update/delete
CREATE POLICY "Organiser can insert influence"
  ON territory_influence FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = territory_influence.campaign_id
        AND campaigns.organiser_id = auth.uid()
    )
    OR
    -- Also allow server-side inserts via authenticated users who are members
    -- (needed for auto-update when battle is logged)
    public.is_campaign_member(campaign_id)
  );

CREATE POLICY "Organiser can update influence"
  ON territory_influence FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = territory_influence.campaign_id
        AND campaigns.organiser_id = auth.uid()
    )
    OR
    public.is_campaign_member(campaign_id)
  );

CREATE POLICY "Organiser can delete influence"
  ON territory_influence FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = territory_influence.campaign_id
        AND campaigns.organiser_id = auth.uid()
    )
  );

-- ============================================================
-- DONE. After running this, you'll see a new 'territory_influence'
-- table in your Supabase Table Editor.
-- ============================================================
