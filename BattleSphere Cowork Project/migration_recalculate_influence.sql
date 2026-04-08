-- ============================================================
-- Recalculate all territory influence from battle history
-- New rules: Win → winner +3, loser +1 · Draw → both +2
--
-- ⚠️  This script WIPES all current influence totals and
--     rebuilds them from scratch based on logged battles.
--     Any values set via the manual override tool will be lost.
--
-- Run in: Supabase → SQL Editor → New Query → paste → Run
-- ============================================================

-- Step 1: Clear all existing influence rows
DELETE FROM territory_influence;

-- Step 2: Rebuild from battles
-- We compute per-faction deltas for every battle that had a territory,
-- then aggregate and insert the totals.

WITH battle_deltas AS (

  -- Winner gets +3 (win only)
  SELECT
    campaign_id,
    territory_id,
    winner_faction_id   AS faction_id,
    3                   AS delta
  FROM battles
  WHERE territory_id        IS NOT NULL
    AND winner_faction_id   IS NOT NULL   -- not a draw
    AND attacker_faction_id IS NOT NULL
    AND defender_faction_id IS NOT NULL

  UNION ALL

  -- Loser gets +1 — attacker was the loser
  SELECT
    campaign_id,
    territory_id,
    attacker_faction_id AS faction_id,
    1                   AS delta
  FROM battles
  WHERE territory_id        IS NOT NULL
    AND winner_faction_id   IS NOT NULL               -- not a draw
    AND winner_faction_id   = defender_faction_id     -- attacker lost
    AND attacker_faction_id IS NOT NULL
    AND defender_faction_id IS NOT NULL

  UNION ALL

  -- Loser gets +1 — defender was the loser
  SELECT
    campaign_id,
    territory_id,
    defender_faction_id AS faction_id,
    1                   AS delta
  FROM battles
  WHERE territory_id        IS NOT NULL
    AND winner_faction_id   IS NOT NULL               -- not a draw
    AND winner_faction_id   = attacker_faction_id     -- defender lost
    AND attacker_faction_id IS NOT NULL
    AND defender_faction_id IS NOT NULL

  UNION ALL

  -- Draw: attacker gets +2
  SELECT
    campaign_id,
    territory_id,
    attacker_faction_id AS faction_id,
    2                   AS delta
  FROM battles
  WHERE territory_id        IS NOT NULL
    AND winner_faction_id   IS NULL       -- draw
    AND attacker_faction_id IS NOT NULL
    AND defender_faction_id IS NOT NULL

  UNION ALL

  -- Draw: defender gets +2
  SELECT
    campaign_id,
    territory_id,
    defender_faction_id AS faction_id,
    2                   AS delta
  FROM battles
  WHERE territory_id        IS NOT NULL
    AND winner_faction_id   IS NULL       -- draw
    AND attacker_faction_id IS NOT NULL
    AND defender_faction_id IS NOT NULL

),

aggregated AS (
  SELECT
    campaign_id,
    territory_id,
    faction_id,
    SUM(delta)::integer AS influence_points
  FROM battle_deltas
  GROUP BY campaign_id, territory_id, faction_id
)

INSERT INTO territory_influence (campaign_id, territory_id, faction_id, influence_points, updated_at, created_at)
SELECT
  campaign_id,
  territory_id,
  faction_id,
  influence_points,
  NOW(),
  NOW()
FROM aggregated;

-- ============================================================
-- Done! Check the result:
-- SELECT COUNT(*) FROM territory_influence;
-- SELECT * FROM territory_influence ORDER BY influence_points DESC LIMIT 20;
-- ============================================================
