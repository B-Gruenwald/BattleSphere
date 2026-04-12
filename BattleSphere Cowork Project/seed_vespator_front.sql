-- ============================================================
-- SEED: War on the Vespator Front — 500 Worlds Campaign Map
-- ============================================================
-- What this does:
--   1. Finds the campaign by name (looks for "Vespator Front")
--   2. Deletes any auto-generated territories + warp routes
--   3. Inserts all 13 worlds as top-level territories (depth 1)
--      with approximate map positions matching the official map
--   4. Inserts 32 Infrastructure Locations as sub-territories (depth 2)
--   5. Inserts all 20 warp route connections
--
-- How to run:
--   Supabase Dashboard → SQL Editor → New query → paste → Run
--
-- Field conventions (as used in BattleSphere map editor):
--   type        — theater types, e.g. "Theaters: Spaceport, Forge Complex"
--   description — system name, e.g. "Kasphos System"
--
-- Note: "Vikus Decima" matches the live campaign data.
--   The official 500 Worlds map spells it "Vilkus Decima" —
--   update both the world name and its two sub-territory names if preferred.
-- ============================================================

DO $$
DECLARE
  cid            uuid;

  -- Top-level world IDs
  t_noralus      uuid;
  t_felgris      uuid;
  t_masnet       uuid;
  t_tarkad       uuid;
  t_yawardet     uuid;
  t_karabas      uuid;
  t_kryndaer     uuid;
  t_novamagnor   uuid;
  t_astarthem    uuid;
  t_caltus       uuid;
  t_marvinius    uuid;
  t_vikus        uuid;
  t_ikaron       uuid;

BEGIN

  -- ── 1. Find the campaign ───────────────────────────────────────────────────
  SELECT id INTO cid
    FROM campaigns
   WHERE name ILIKE '%Vespator Front%'
   LIMIT 1;

  IF cid IS NULL THEN
    RAISE EXCEPTION 'Campaign not found — make sure the campaign name contains "Vespator Front".';
  END IF;

  RAISE NOTICE 'Found campaign: %', cid;

  -- ── 2. Clean up auto-generated data ───────────────────────────────────────
  DELETE FROM warp_routes WHERE campaign_id = cid;
  DELETE FROM territory_influence
    WHERE territory_id IN (SELECT id FROM territories WHERE campaign_id = cid);
  DELETE FROM territories WHERE campaign_id = cid;

  RAISE NOTICE 'Cleared existing territories and routes.';

  -- ── 3. Insert the 13 worlds (top-level territories, depth 1) ──────────────
  -- x_pos / y_pos are in SVG % coordinates (10–90 x, 8–76 y).
  -- Positions are calibrated to mirror the official Vespator Front map layout.
  -- type        = theater types (as shown in BattleSphere territory cards)
  -- description = system name

  INSERT INTO territories (campaign_id, name, type, description, depth, x_pos, y_pos)
    VALUES (cid, 'Noralus',
      'Theaters: Delvsite Facility, Tomb World, Hab Sprawl',
      'Gorung System',
      1, 15, 22)
    RETURNING id INTO t_noralus;

  INSERT INTO territories (campaign_id, name, type, description, depth, x_pos, y_pos)
    VALUES (cid, 'Felgris Secundas',
      'Theaters: Forge Complex, Xenoflora Jungle',
      'Ostmanden System',
      1, 55, 11)
    RETURNING id INTO t_felgris;

  INSERT INTO territories (campaign_id, name, type, description, depth, x_pos, y_pos)
    VALUES (cid, 'Masnet',
      'Theaters: Dead Lands, Spaceport, Hab Sprawl',
      'Kasphos System',
      1, 34, 22)
    RETURNING id INTO t_masnet;

  INSERT INTO territories (campaign_id, name, type, description, depth, x_pos, y_pos)
    VALUES (cid, 'Tarkad Vindix',
      'Theaters: Xenoflora Jungle, Desolate Wastes',
      'Reiya System',
      1, 70, 22)
    RETURNING id INTO t_tarkad;

  INSERT INTO territories (campaign_id, name, type, description, depth, x_pos, y_pos)
    VALUES (cid, 'Yawardet',
      'Theaters: Tomb Complex, Hab Sprawl, Dead Lands',
      'Esvar System',
      1, 84, 26)
    RETURNING id INTO t_yawardet;

  INSERT INTO territories (campaign_id, name, type, description, depth, x_pos, y_pos)
    VALUES (cid, 'Karabas',
      'Theaters: Delvesite, Forge Complex',
      'Salen System',
      1, 12, 46)
    RETURNING id INTO t_karabas;

  INSERT INTO territories (campaign_id, name, type, description, depth, x_pos, y_pos)
    VALUES (cid, 'Kryndaer',
      'Theaters: Tomb Complex, Delvesite Facility, Xenoflora Jungle',
      'Zur Mortalis System',
      1, 33, 40)
    RETURNING id INTO t_kryndaer;

  INSERT INTO territories (campaign_id, name, type, description, depth, x_pos, y_pos)
    VALUES (cid, 'Novamagnor',
      'Theaters: Spaceport, Tomb World',
      'Heliodras System',
      1, 52, 44)
    RETURNING id INTO t_novamagnor;

  INSERT INTO territories (campaign_id, name, type, description, depth, x_pos, y_pos)
    VALUES (cid, 'Astarthem',
      'Theaters: Spaceport, Desolate Wastes',
      'Orphos System',
      1, 73, 47)
    RETURNING id INTO t_astarthem;

  INSERT INTO territories (campaign_id, name, type, description, depth, x_pos, y_pos)
    VALUES (cid, 'Caltus Novem',
      'Theaters: Dead Lands, Forge Complex, Xenoflora Jungle',
      'Vespator System',
      1, 44, 60)
    RETURNING id INTO t_caltus;

  INSERT INTO territories (campaign_id, name, type, description, depth, x_pos, y_pos)
    VALUES (cid, 'Marvinius',
      'Theaters: Tomb Complex, Hab Sprawl',
      'Diodecis System',
      1, 26, 69)
    RETURNING id INTO t_marvinius;

  INSERT INTO territories (campaign_id, name, type, description, depth, x_pos, y_pos)
    VALUES (cid, 'Vikus Decima',
      'Theaters: Space Port, Desolate Wastes',
      'Vilkum System',
      1, 53, 70)
    RETURNING id INTO t_vikus;

  INSERT INTO territories (campaign_id, name, type, description, depth, x_pos, y_pos)
    VALUES (cid, 'Ikaron Prime',
      'Theaters: Tomb Complex, Hab Sprawl, Delvsite Facility',
      'Ikaron System',
      1, 80, 66)
    RETURNING id INTO t_ikaron;

  RAISE NOTICE 'Inserted 13 worlds.';

  -- ── 4. Infrastructure Locations (sub-territories, depth 2) ────────────────
  -- Positions orbit loosely around their parent world.
  -- The map's normalise-positions pass will fine-tune spacing on render.

  -- Noralus — 3 locations
  INSERT INTO territories (campaign_id, parent_id, name, type, depth, x_pos, y_pos) VALUES
    (cid, t_noralus, 'Noralus — Infrastructure Location A', 'Infrastructure Location', 2, 15, 15),
    (cid, t_noralus, 'Noralus — Infrastructure Location B', 'Infrastructure Location', 2, 21, 26),
    (cid, t_noralus, 'Noralus — Infrastructure Location C', 'Infrastructure Location', 2,  9, 26);

  -- Felgris Secundas — 3 locations
  INSERT INTO territories (campaign_id, parent_id, name, type, depth, x_pos, y_pos) VALUES
    (cid, t_felgris, 'Felgris Secundas — Infrastructure Location A', 'Infrastructure Location', 2, 55, 15),
    (cid, t_felgris, 'Felgris Secundas — Infrastructure Location B', 'Infrastructure Location', 2, 61, 18),
    (cid, t_felgris, 'Felgris Secundas — Infrastructure Location C', 'Infrastructure Location', 2, 49, 18);

  -- Masnet — 2 locations
  INSERT INTO territories (campaign_id, parent_id, name, type, depth, x_pos, y_pos) VALUES
    (cid, t_masnet, 'Masnet — Infrastructure Location A', 'Infrastructure Location', 2, 34, 15),
    (cid, t_masnet, 'Masnet — Infrastructure Location B', 'Infrastructure Location', 2, 34, 29);

  -- Tarkad Vindix — 2 locations
  INSERT INTO territories (campaign_id, parent_id, name, type, depth, x_pos, y_pos) VALUES
    (cid, t_tarkad, 'Tarkad Vindix — Infrastructure Location A', 'Infrastructure Location', 2, 70, 15),
    (cid, t_tarkad, 'Tarkad Vindix — Infrastructure Location B', 'Infrastructure Location', 2, 70, 29);

  -- Yawardet — 3 locations
  INSERT INTO territories (campaign_id, parent_id, name, type, depth, x_pos, y_pos) VALUES
    (cid, t_yawardet, 'Yawardet — Infrastructure Location A', 'Infrastructure Location', 2, 84, 19),
    (cid, t_yawardet, 'Yawardet — Infrastructure Location B', 'Infrastructure Location', 2, 90, 30),
    (cid, t_yawardet, 'Yawardet — Infrastructure Location C', 'Infrastructure Location', 2, 78, 30);

  -- Karabas — 3 locations
  INSERT INTO territories (campaign_id, parent_id, name, type, depth, x_pos, y_pos) VALUES
    (cid, t_karabas, 'Karabas — Infrastructure Location A', 'Infrastructure Location', 2, 12, 39),
    (cid, t_karabas, 'Karabas — Infrastructure Location B', 'Infrastructure Location', 2, 18, 51),
    (cid, t_karabas, 'Karabas — Infrastructure Location C', 'Infrastructure Location', 2,  6, 51);

  -- Kryndaer — 2 locations
  INSERT INTO territories (campaign_id, parent_id, name, type, depth, x_pos, y_pos) VALUES
    (cid, t_kryndaer, 'Kryndaer — Infrastructure Location A', 'Infrastructure Location', 2, 33, 33),
    (cid, t_kryndaer, 'Kryndaer — Infrastructure Location B', 'Infrastructure Location', 2, 33, 47);

  -- Novamagnor — 2 locations
  INSERT INTO territories (campaign_id, parent_id, name, type, depth, x_pos, y_pos) VALUES
    (cid, t_novamagnor, 'Novamagnor — Infrastructure Location A', 'Infrastructure Location', 2, 52, 37),
    (cid, t_novamagnor, 'Novamagnor — Infrastructure Location B', 'Infrastructure Location', 2, 52, 51);

  -- Astarthem — 2 locations
  INSERT INTO territories (campaign_id, parent_id, name, type, depth, x_pos, y_pos) VALUES
    (cid, t_astarthem, 'Astarthem — Infrastructure Location A', 'Infrastructure Location', 2, 73, 40),
    (cid, t_astarthem, 'Astarthem — Infrastructure Location B', 'Infrastructure Location', 2, 73, 54);

  -- Caltus Novem — 2 locations
  INSERT INTO territories (campaign_id, parent_id, name, type, depth, x_pos, y_pos) VALUES
    (cid, t_caltus, 'Caltus Novem — Infrastructure Location A', 'Infrastructure Location', 2, 44, 53),
    (cid, t_caltus, 'Caltus Novem — Infrastructure Location B', 'Infrastructure Location', 2, 44, 67);

  -- Marvinius — 3 locations
  INSERT INTO territories (campaign_id, parent_id, name, type, depth, x_pos, y_pos) VALUES
    (cid, t_marvinius, 'Marvinius — Infrastructure Location A', 'Infrastructure Location', 2, 26, 62),
    (cid, t_marvinius, 'Marvinius — Infrastructure Location B', 'Infrastructure Location', 2, 32, 74),
    (cid, t_marvinius, 'Marvinius — Infrastructure Location C', 'Infrastructure Location', 2, 20, 74);

  -- Vikus Decima — 2 locations
  INSERT INTO territories (campaign_id, parent_id, name, type, depth, x_pos, y_pos) VALUES
    (cid, t_vikus, 'Vikus Decima — Infrastructure Location A', 'Infrastructure Location', 2, 53, 63),
    (cid, t_vikus, 'Vikus Decima — Infrastructure Location B', 'Infrastructure Location', 2, 53, 76);

  -- Ikaron Prime — 3 locations
  INSERT INTO territories (campaign_id, parent_id, name, type, depth, x_pos, y_pos) VALUES
    (cid, t_ikaron, 'Ikaron Prime — Infrastructure Location A', 'Infrastructure Location', 2, 80, 59),
    (cid, t_ikaron, 'Ikaron Prime — Infrastructure Location B', 'Infrastructure Location', 2, 86, 72),
    (cid, t_ikaron, 'Ikaron Prime — Infrastructure Location C', 'Infrastructure Location', 2, 74, 72);

  RAISE NOTICE 'Inserted 32 infrastructure locations.';

  -- ── 5. Warp Routes (18 connections) ──────────────────────────────────────
  -- LEAST/GREATEST ensures territory_a ≤ territory_b (UUID string order)
  -- which satisfies the UNIQUE (campaign_id, territory_a, territory_b) constraint.

  INSERT INTO warp_routes (campaign_id, territory_a, territory_b) VALUES
    -- Noralus connections
    (cid, LEAST(t_noralus, t_masnet),       GREATEST(t_noralus, t_masnet)),
    (cid, LEAST(t_noralus, t_karabas),      GREATEST(t_noralus, t_karabas)),
    (cid, LEAST(t_noralus, t_kryndaer),     GREATEST(t_noralus, t_kryndaer)),
    -- Felgris Secundas connections
    (cid, LEAST(t_felgris, t_masnet),       GREATEST(t_felgris, t_masnet)),
    (cid, LEAST(t_felgris, t_tarkad),       GREATEST(t_felgris, t_tarkad)),
    -- Tarkad Vindix connections (remaining)
    (cid, LEAST(t_tarkad, t_masnet),        GREATEST(t_tarkad, t_masnet)),
    (cid, LEAST(t_tarkad, t_yawardet),      GREATEST(t_tarkad, t_yawardet)),
    (cid, LEAST(t_tarkad, t_novamagnor),    GREATEST(t_tarkad, t_novamagnor)),
    -- Yawardet connections (remaining)
    (cid, LEAST(t_yawardet, t_astarthem),   GREATEST(t_yawardet, t_astarthem)),
    (cid, LEAST(t_yawardet, t_ikaron),      GREATEST(t_yawardet, t_ikaron)),
    -- Karabas connections (remaining)
    (cid, LEAST(t_karabas, t_kryndaer),     GREATEST(t_karabas, t_kryndaer)),
    -- Kryndaer connections (remaining)
    (cid, LEAST(t_kryndaer, t_caltus),      GREATEST(t_kryndaer, t_caltus)),
    -- Novamagnor connections (remaining)
    (cid, LEAST(t_novamagnor, t_astarthem), GREATEST(t_novamagnor, t_astarthem)),
    (cid, LEAST(t_novamagnor, t_ikaron),    GREATEST(t_novamagnor, t_ikaron)),
    -- Caltus Novem connections (remaining)
    (cid, LEAST(t_caltus, t_marvinius),     GREATEST(t_caltus, t_marvinius)),
    (cid, LEAST(t_caltus, t_vikus),         GREATEST(t_caltus, t_vikus)),
    -- Marvinius connections (remaining)
    (cid, LEAST(t_marvinius, t_vikus),      GREATEST(t_marvinius, t_vikus)),
    -- Vikus Decima connections (remaining)
    (cid, LEAST(t_vikus, t_ikaron),         GREATEST(t_vikus, t_ikaron));

  RAISE NOTICE 'Inserted 18 warp routes.';
  RAISE NOTICE '✓ Vespator Front seed complete!';

END $$;

-- ── Verify counts ─────────────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM territories t
     JOIN campaigns c ON c.id = t.campaign_id
    WHERE c.name ILIKE '%Vespator Front%' AND t.depth = 1) AS worlds,
  (SELECT count(*) FROM territories t
     JOIN campaigns c ON c.id = t.campaign_id
    WHERE c.name ILIKE '%Vespator Front%' AND t.depth = 2) AS infrastructure_locations,
  (SELECT count(*) FROM warp_routes wr
     JOIN campaigns c ON c.id = wr.campaign_id
    WHERE c.name ILIKE '%Vespator Front%')                  AS warp_routes;
-- Expected: worlds=13, infrastructure_locations=32, warp_routes=18
