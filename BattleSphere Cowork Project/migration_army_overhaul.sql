-- Army Overhaul migration
-- Adds: faction_id to campaign_army_records, Kill Team fields, army_id_p1/p2 to battles
-- Run in Supabase SQL editor.

-- 1. Link deployed army to a campaign faction
ALTER TABLE campaign_army_records
  ADD COLUMN IF NOT EXISTS faction_id UUID REFERENCES factions(id) ON DELETE SET NULL;

-- 2. Kill Team roster fields
ALTER TABLE campaign_army_records
  ADD COLUMN IF NOT EXISTS kt_spec_ops_note TEXT;
ALTER TABLE campaign_army_records
  ADD COLUMN IF NOT EXISTS kt_equipment_points INT NOT NULL DEFAULT 0;

-- 3. Optional army attribution on battles (nullable — no existing data affected)
ALTER TABLE battles
  ADD COLUMN IF NOT EXISTS army_id_p1 UUID REFERENCES armies(id) ON DELETE SET NULL;
ALTER TABLE battles
  ADD COLUMN IF NOT EXISTS army_id_p2 UUID REFERENCES armies(id) ON DELETE SET NULL;
