-- ============================================================
-- SEED: Home Game League — Demo Data
-- Campaign slug: home-game-league-anpa6
-- ============================================================
-- What this does:
--   1. Creates 8 demo auth users + profiles
--   2. Adds them as campaign members (2 per faction/team)
--   3. Creates 8 armies with units
--   4. Links armies to campaign via campaign_army_records
--   5. Inserts 24 battles producing target standings
--   6. Inserts 5 chronicle_weekly_updates (hobby + crusade)
--
-- IDEMPOTENT: safe to run multiple times (ON CONFLICT DO NOTHING)
-- Fixed UUID prefixes: a100000x = users, b100000x = armies,
--                      d100000x = battles, e100000x = chronicle
--
-- Run in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

DO $$
DECLARE
  -- Campaign
  cid  uuid;

  -- Faction IDs (looked up by name)
  f_wardens  uuid;  -- Imperial Wardens
  f_hive     uuid;  -- Forces of the Hive Mind
  f_chaos    uuid;  -- Chosen of Chaos
  f_indie    uuid;  -- Independent Leagues

  -- Player UUIDs (fixed)
  u_kv  uuid := 'a1000001-0000-0000-0000-000000000000';
  u_wm  uuid := 'a1000002-0000-0000-0000-000000000000';
  u_ht  uuid := 'a1000003-0000-0000-0000-000000000000';
  u_sx  uuid := 'a1000004-0000-0000-0000-000000000000';
  u_dp  uuid := 'a1000005-0000-0000-0000-000000000000';
  u_np  uuid := 'a1000006-0000-0000-0000-000000000000';
  u_fa  uuid := 'a1000007-0000-0000-0000-000000000000';
  u_rm  uuid := 'a1000008-0000-0000-0000-000000000000';

  -- Army UUIDs (fixed)
  a_kv  uuid := 'b1000001-0000-0000-0000-000000000000';
  a_wm  uuid := 'b1000002-0000-0000-0000-000000000000';
  a_ht  uuid := 'b1000003-0000-0000-0000-000000000000';
  a_sx  uuid := 'b1000004-0000-0000-0000-000000000000';
  a_dp  uuid := 'b1000005-0000-0000-0000-000000000000';
  a_np  uuid := 'b1000006-0000-0000-0000-000000000000';
  a_fa  uuid := 'b1000007-0000-0000-0000-000000000000';
  a_rm  uuid := 'b1000008-0000-0000-0000-000000000000';

BEGIN

  -- ── 1. Find the campaign ───────────────────────────────────────────────────
  SELECT id INTO cid FROM campaigns WHERE slug = 'home-game-league-anpa6' LIMIT 1;
  IF cid IS NULL THEN
    RAISE EXCEPTION 'Campaign home-game-league-anpa6 not found.';
  END IF;
  RAISE NOTICE 'Campaign ID: %', cid;

  -- ── 2. Look up faction IDs ─────────────────────────────────────────────────
  SELECT id INTO f_wardens FROM factions WHERE campaign_id = cid AND name = 'Imperial Wardens' LIMIT 1;
  SELECT id INTO f_hive    FROM factions WHERE campaign_id = cid AND name = 'Forces of the Hive Mind' LIMIT 1;
  SELECT id INTO f_chaos   FROM factions WHERE campaign_id = cid AND name = 'Chosen of Chaos' LIMIT 1;
  SELECT id INTO f_indie   FROM factions WHERE campaign_id = cid AND name = 'Independent Leagues' LIMIT 1;

  IF f_wardens IS NULL THEN RAISE EXCEPTION 'Faction "Imperial Wardens" not found. Create factions first.'; END IF;
  IF f_hive    IS NULL THEN RAISE EXCEPTION 'Faction "Forces of the Hive Mind" not found.'; END IF;
  IF f_chaos   IS NULL THEN RAISE EXCEPTION 'Faction "Chosen of Chaos" not found.'; END IF;
  IF f_indie   IS NULL THEN RAISE EXCEPTION 'Faction "Independent Leagues" not found.'; END IF;

  RAISE NOTICE 'Factions found. Inserting users...';

  -- ── 3. Auth users (minimal — demo accounts, not intended for login) ────────
  -- IMPORTANT: raw_user_meta_data must include "username" so the handle_new_user()
  -- trigger can create the profiles row without a NOT NULL violation.
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES
    ('00000000-0000-0000-0000-000000000000', u_kv, 'authenticated', 'authenticated',
     'kaiservon@demo.battlesphere.cc', crypt('Demo_Unused_9kX!', gen_salt('bf')),
     '2026-01-15 10:00:00+00', '{"provider":"email","providers":["email"]}',
     '{"username":"KaiserVon"}',
     '2026-01-15 10:00:00+00', '2026-01-15 10:00:00+00'),
    ('00000000-0000-0000-0000-000000000000', u_wm, 'authenticated', 'authenticated',
     'wardmaster9@demo.battlesphere.cc', crypt('Demo_Unused_9kX!', gen_salt('bf')),
     '2026-01-15 10:00:00+00', '{"provider":"email","providers":["email"]}',
     '{"username":"WardMaster9"}',
     '2026-01-15 10:00:00+00', '2026-01-15 10:00:00+00'),
    ('00000000-0000-0000-0000-000000000000', u_ht, 'authenticated', 'authenticated',
     'hivetyrant@demo.battlesphere.cc', crypt('Demo_Unused_9kX!', gen_salt('bf')),
     '2026-01-15 10:00:00+00', '{"provider":"email","providers":["email"]}',
     '{"username":"HiveTyrant"}',
     '2026-01-15 10:00:00+00', '2026-01-15 10:00:00+00'),
    ('00000000-0000-0000-0000-000000000000', u_sx, 'authenticated', 'authenticated',
     'swarmlordx@demo.battlesphere.cc', crypt('Demo_Unused_9kX!', gen_salt('bf')),
     '2026-01-15 10:00:00+00', '{"provider":"email","providers":["email"]}',
     '{"username":"SwarmlordX"}',
     '2026-01-15 10:00:00+00', '2026-01-15 10:00:00+00'),
    ('00000000-0000-0000-0000-000000000000', u_dp, 'authenticated', 'authenticated',
     'darkpatron@demo.battlesphere.cc', crypt('Demo_Unused_9kX!', gen_salt('bf')),
     '2026-01-15 10:00:00+00', '{"provider":"email","providers":["email"]}',
     '{"username":"DarkPatron"}',
     '2026-01-15 10:00:00+00', '2026-01-15 10:00:00+00'),
    ('00000000-0000-0000-0000-000000000000', u_np, 'authenticated', 'authenticated',
     'nightprince@demo.battlesphere.cc', crypt('Demo_Unused_9kX!', gen_salt('bf')),
     '2026-01-15 10:00:00+00', '{"provider":"email","providers":["email"]}',
     '{"username":"NightPrince"}',
     '2026-01-15 10:00:00+00', '2026-01-15 10:00:00+00'),
    ('00000000-0000-0000-0000-000000000000', u_fa, 'authenticated', 'authenticated',
     'freeagent@demo.battlesphere.cc', crypt('Demo_Unused_9kX!', gen_salt('bf')),
     '2026-01-15 10:00:00+00', '{"provider":"email","providers":["email"]}',
     '{"username":"FreeAgent"}',
     '2026-01-15 10:00:00+00', '2026-01-15 10:00:00+00'),
    ('00000000-0000-0000-0000-000000000000', u_rm, 'authenticated', 'authenticated',
     'roguemercenary@demo.battlesphere.cc', crypt('Demo_Unused_9kX!', gen_salt('bf')),
     '2026-01-15 10:00:00+00', '{"provider":"email","providers":["email"]}',
     '{"username":"RogueMercenary"}',
     '2026-01-15 10:00:00+00', '2026-01-15 10:00:00+00')
  ON CONFLICT (id) DO NOTHING;

  -- ── 4. Profiles ────────────────────────────────────────────────────────────
  INSERT INTO profiles (id, username, created_at)
  VALUES
    (u_kv, 'KaiserVon',       '2026-01-15 10:00:00+00'),
    (u_wm, 'WardMaster9',     '2026-01-15 10:00:00+00'),
    (u_ht, 'HiveTyrant',      '2026-01-15 10:00:00+00'),
    (u_sx, 'SwarmlordX',      '2026-01-15 10:00:00+00'),
    (u_dp, 'DarkPatron',      '2026-01-15 10:00:00+00'),
    (u_np, 'NightPrince',     '2026-01-15 10:00:00+00'),
    (u_fa, 'FreeAgent',       '2026-01-15 10:00:00+00'),
    (u_rm, 'RogueMercenary',  '2026-01-15 10:00:00+00')
  ON CONFLICT (id) DO NOTHING;

  -- ── 5. Campaign members ────────────────────────────────────────────────────
  -- 2 players per faction; role = 'member' (organiser is not changed)
  INSERT INTO campaign_members (campaign_id, user_id, faction_id, role)
  VALUES
    (cid, u_kv, f_wardens, 'member'),
    (cid, u_wm, f_wardens, 'member'),
    (cid, u_ht, f_hive,    'member'),
    (cid, u_sx, f_hive,    'member'),
    (cid, u_dp, f_chaos,   'member'),
    (cid, u_np, f_chaos,   'member'),
    (cid, u_fa, f_indie,   'member'),
    (cid, u_rm, f_indie,   'member')
  ON CONFLICT DO NOTHING;

  -- ── 6. Armies ──────────────────────────────────────────────────────────────
  INSERT INTO armies (id, player_id, name, game_system, faction_name, tagline, is_public, created_at)
  VALUES
    (a_kv, u_kv, 'Steel Wardens',         'Warhammer 40,000', 'Adeptus Astartes',       'Honour through endurance.',       true, '2026-01-16 10:00:00+00'),
    (a_wm, u_wm, 'Order of the Vigilant', 'Warhammer 40,000', 'Adeptus Astartes',       'Watchful, relentless, unbroken.', true, '2026-01-16 10:00:00+00'),
    (a_ht, u_ht, 'Hive Fleet Moloch',     'Warhammer 40,000', 'Tyranids',               'Consume. Adapt. Evolve.',         true, '2026-01-16 10:00:00+00'),
    (a_sx, u_sx, 'Devourer Strain',        'Warhammer 40,000', 'Tyranids',               'The swarm cannot be stopped.',    true, '2026-01-16 10:00:00+00'),
    (a_dp, u_dp, 'Chosen of Brass',        'Warhammer 40,000', 'Chaos Space Marines',    'Khorne demands tribute.',         true, '2026-01-16 10:00:00+00'),
    (a_np, u_np, 'Night''s Chosen',        'Warhammer 40,000', 'Chaos Space Marines',    'From shadow, we strike.',         true, '2026-01-16 10:00:00+00'),
    (a_fa, u_fa, 'Renegade Liberators',    'Warhammer 40,000', 'Adeptus Mechanicus',     'Omnissiah guides our steel.',     true, '2026-01-16 10:00:00+00'),
    (a_rm, u_rm, 'Iron Dogs Company',      'Warhammer 40,000', 'Astra Militarum',        'First in, last out.',             true, '2026-01-16 10:00:00+00')
  ON CONFLICT (id) DO NOTHING;

  -- ── 7. Army units ──────────────────────────────────────────────────────────
  -- Steel Wardens (KaiserVon)
  INSERT INTO army_units (army_id, name, unit_type, sort_order) VALUES
    (a_kv, 'Strike Force Alpha',              'Infantry',   1),
    (a_kv, 'Redemptor Dreadnought "Ironveil"','Heavy',      2),
    (a_kv, 'Eliminators Squad Phalanx',       'Infantry',   3),
    (a_kv, 'Scout Squad Phantom',             'Infantry',   4),
    (a_kv, 'Kill Team Sigma',                 'Infantry',   5)
  ON CONFLICT DO NOTHING;

  -- Order of the Vigilant (WardMaster9)
  INSERT INTO army_units (army_id, name, unit_type, sort_order) VALUES
    (a_wm, 'Terminator Squad Aurum',          'Infantry',   1),
    (a_wm, 'Vanguard Veterans',               'Infantry',   2),
    (a_wm, 'Tactical Squad Carinae',          'Infantry',   3)
  ON CONFLICT DO NOTHING;

  -- Hive Fleet Moloch (HiveTyrant)
  INSERT INTO army_units (army_id, name, unit_type, sort_order) VALUES
    (a_ht, 'Hive Tyrant "The Devouring Eye"', 'Monster',    1),
    (a_ht, 'Carnifex Brood "Crushers"',       'Monster',    2),
    (a_ht, 'Hormagaunt Swarm',                'Infantry',   3),
    (a_ht, 'Ravener Pack',                    'Infantry',   4)
  ON CONFLICT DO NOTHING;

  -- Devourer Strain (SwarmlordX)
  INSERT INTO army_units (army_id, name, unit_type, sort_order) VALUES
    (a_sx, 'The Swarmlord',                   'Monster',    1),
    (a_sx, 'Genestealers',                    'Infantry',   2),
    (a_sx, 'Termagant Brood',                 'Infantry',   3)
  ON CONFLICT DO NOTHING;

  -- Chosen of Brass (DarkPatron)
  INSERT INTO army_units (army_id, name, unit_type, sort_order) VALUES
    (a_dp, 'Berzerker Squad Omega',            'Infantry',   1),
    (a_dp, 'Obliterators',                     'Heavy',      2),
    (a_dp, 'Chaos Rhino "Helltrack"',          'Vehicle',    3),
    (a_dp, 'Chaos Lord "The Brass Patron"',    'Character',  4)
  ON CONFLICT DO NOTHING;

  -- Night's Chosen (NightPrince)
  INSERT INTO army_units (army_id, name, unit_type, sort_order) VALUES
    (a_np, 'Chaos Spawn "The Writhing"',       'Monster',    1),
    (a_np, 'Tzaangors',                        'Infantry',   2),
    (a_np, 'Sorcerer Aurelius',                'Character',  3)
  ON CONFLICT DO NOTHING;

  -- Renegade Liberators (FreeAgent)
  INSERT INTO army_units (army_id, name, unit_type, sort_order) VALUES
    (a_fa, 'Skitarii Vanguard "Free Blade"',   'Infantry',   1),
    (a_fa, 'Ironstrider Ballistarius',         'Vehicle',    2),
    (a_fa, 'Command Section',                  'Infantry',   3)
  ON CONFLICT DO NOTHING;

  -- Iron Dogs Company (RogueMercenary)
  INSERT INTO army_units (army_id, name, unit_type, sort_order) VALUES
    (a_rm, 'Infantry Platoon "Iron Dogs"',     'Infantry',   1),
    (a_rm, 'Heavy Weapons Squad',              'Infantry',   2),
    (a_rm, 'Chimera "Rust Bucket"',            'Vehicle',    3)
  ON CONFLICT DO NOTHING;

  -- ── 8. Campaign army records ───────────────────────────────────────────────
  INSERT INTO campaign_army_records (campaign_id, army_id, player_id, crusade_points, supply_limit, supply_used, battles_played, battles_won)
  VALUES
    (cid, a_kv, u_kv, 16, 50, 42, 6, 5),
    (cid, a_wm, u_wm,  7, 50, 32, 6, 2),
    (cid, a_ht, u_ht, 14, 50, 48, 6, 3),
    (cid, a_sx, u_sx,  6, 50, 30, 6, 2),
    (cid, a_dp, u_dp, 15, 50, 44, 6, 4),
    (cid, a_np, u_np,  4, 50, 28, 6, 1),
    (cid, a_fa, u_fa, 13, 50, 40, 6, 4),
    (cid, a_rm, u_rm,  2, 50, 24, 6, 0)
  ON CONFLICT (campaign_id, army_id) DO NOTHING;

  -- ── 9. Battles (24 total) ──────────────────────────────────────────────────
  -- Standings: KaiserVon 16, DarkPatron 13, FreeAgent 13, HiveTyrant 11,
  --            WardMaster9 7, SwarmlordX 6, NightPrince 3, RogueMercenary 0
  -- 3 draws (winner_faction_id NULL), 21 decisive results.

  -- Round 1 — 7 Feb 2026
  INSERT INTO battles (id, campaign_id, attacker_player_id, defender_player_id,
    attacker_faction_id, defender_faction_id, winner_faction_id, result, logged_by, created_at, headline)
  VALUES
    -- Draw: KaiserVon vs HiveTyrant
    ('d1000001-0000-0000-0000-000000000000', cid, u_kv, u_ht, f_wardens, f_hive, NULL, 'draw',
     u_kv, '2026-02-07 18:30:00+00', 'Hard-fought stalemate on the factory floor'),
    -- Draw: DarkPatron vs FreeAgent
    ('d1000002-0000-0000-0000-000000000000', cid, u_dp, u_fa, f_chaos, f_indie, NULL, 'draw',
     u_dp, '2026-02-07 20:00:00+00', 'Brass and steel grind to a halt'),
    -- Draw: HiveTyrant vs WardMaster9
    ('d1000003-0000-0000-0000-000000000000', cid, u_ht, u_wm, f_hive, f_wardens, NULL, 'draw',
     u_ht, '2026-02-07 21:15:00+00', 'The swarm falls just short of total consumption'),
    -- KaiserVon beats WardMaster9
    ('d1000004-0000-0000-0000-000000000000', cid, u_kv, u_wm, f_wardens, f_wardens, f_wardens, 'attacker_wins',
     u_kv, '2026-02-07 22:30:00+00', 'Brothers in arms — one side walks away victorious')
  ON CONFLICT (id) DO NOTHING;

  -- Round 2 — 14 Feb 2026
  INSERT INTO battles (id, campaign_id, attacker_player_id, defender_player_id,
    attacker_faction_id, defender_faction_id, winner_faction_id, result, logged_by, created_at, headline)
  VALUES
    -- KaiserVon beats SwarmlordX
    ('d1000005-0000-0000-0000-000000000000', cid, u_kv, u_sx, f_wardens, f_hive, f_wardens, 'attacker_wins',
     u_kv, '2026-02-14 18:00:00+00', 'Bolter discipline shatters the xenos advance'),
    -- KaiserVon beats NightPrince
    ('d1000006-0000-0000-0000-000000000000', cid, u_kv, u_np, f_wardens, f_chaos, f_wardens, 'attacker_wins',
     u_kv, '2026-02-14 19:30:00+00', 'Chaos sorcery fails before unshakeable faith'),
    -- KaiserVon beats RogueMercenary
    ('d1000007-0000-0000-0000-000000000000', cid, u_kv, u_rm, f_wardens, f_indie, f_wardens, 'attacker_wins',
     u_kv, '2026-02-14 21:00:00+00', 'No quarter — the Iron Dogs are routed'),
    -- KaiserVon beats FreeAgent
    ('d1000008-0000-0000-0000-000000000000', cid, u_kv, u_fa, f_wardens, f_indie, f_wardens, 'attacker_wins',
     u_kv, '2026-02-14 22:30:00+00', 'Mechanicus ingenuity outgunned at every turn')
  ON CONFLICT (id) DO NOTHING;

  -- Round 3 — 21 Feb 2026
  INSERT INTO battles (id, campaign_id, attacker_player_id, defender_player_id,
    attacker_faction_id, defender_faction_id, winner_faction_id, result, logged_by, created_at, headline)
  VALUES
    -- FreeAgent beats WardMaster9
    ('d1000009-0000-0000-0000-000000000000', cid, u_fa, u_wm, f_indie, f_wardens, f_indie, 'attacker_wins',
     u_fa, '2026-02-21 18:00:00+00', 'Mechanicus precision dismantles the Warden line'),
    -- FreeAgent beats SwarmlordX
    ('d1000010-0000-0000-0000-000000000000', cid, u_fa, u_sx, f_indie, f_hive, f_indie, 'attacker_wins',
     u_fa, '2026-02-21 19:30:00+00', 'Arc rifles cut through chitin with clinical efficiency'),
    -- FreeAgent beats NightPrince
    ('d1000011-0000-0000-0000-000000000000', cid, u_fa, u_np, f_indie, f_chaos, f_indie, 'attacker_wins',
     u_fa, '2026-02-21 21:00:00+00', 'The shadows offer no cover from Omnissiah''s sight'),
    -- FreeAgent beats RogueMercenary
    ('d1000012-0000-0000-0000-000000000000', cid, u_fa, u_rm, f_indie, f_indie, f_indie, 'attacker_wins',
     u_fa, '2026-02-21 22:30:00+00', 'Free Blade cuts the Iron Dogs apart — nothing personal')
  ON CONFLICT (id) DO NOTHING;

  -- Round 4 — 28 Feb 2026
  INSERT INTO battles (id, campaign_id, attacker_player_id, defender_player_id,
    attacker_faction_id, defender_faction_id, winner_faction_id, result, logged_by, created_at, headline)
  VALUES
    -- HiveTyrant beats DarkPatron
    ('d1000013-0000-0000-0000-000000000000', cid, u_ht, u_dp, f_hive, f_chaos, f_hive, 'attacker_wins',
     u_ht, '2026-02-28 18:00:00+00', 'Flesh overwhelms brass — the tyranids feast tonight'),
    -- DarkPatron beats WardMaster9
    ('d1000014-0000-0000-0000-000000000000', cid, u_dp, u_wm, f_chaos, f_wardens, f_chaos, 'attacker_wins',
     u_dp, '2026-02-28 19:30:00+00', 'Berzerker rage overruns the defensive line'),
    -- DarkPatron beats SwarmlordX
    ('d1000015-0000-0000-0000-000000000000', cid, u_dp, u_sx, f_chaos, f_hive, f_chaos, 'attacker_wins',
     u_dp, '2026-02-28 21:00:00+00', 'Khorne cares not — and neither do the Chosen of Brass'),
    -- DarkPatron beats NightPrince
    ('d1000016-0000-0000-0000-000000000000', cid, u_dp, u_np, f_chaos, f_chaos, f_chaos, 'attacker_wins',
     u_dp, '2026-02-28 22:30:00+00', 'The stronger warband prevails — infighting decides the league')
  ON CONFLICT (id) DO NOTHING;

  -- Round 5 — 7 Mar 2026
  INSERT INTO battles (id, campaign_id, attacker_player_id, defender_player_id,
    attacker_faction_id, defender_faction_id, winner_faction_id, result, logged_by, created_at, headline)
  VALUES
    -- DarkPatron beats RogueMercenary
    ('d1000017-0000-0000-0000-000000000000', cid, u_dp, u_rm, f_chaos, f_indie, f_chaos, 'attacker_wins',
     u_dp, '2026-03-07 18:00:00+00', 'The Iron Dogs are ground to powder'),
    -- WardMaster9 beats NightPrince
    ('d1000018-0000-0000-0000-000000000000', cid, u_wm, u_np, f_wardens, f_chaos, f_wardens, 'attacker_wins',
     u_wm, '2026-03-07 19:30:00+00', 'Vigilance rewarded — the Wardens hold'),
    -- WardMaster9 beats RogueMercenary
    ('d1000019-0000-0000-0000-000000000000', cid, u_wm, u_rm, f_wardens, f_indie, f_wardens, 'attacker_wins',
     u_wm, '2026-03-07 21:00:00+00', 'A disciplined volley puts the mercenaries to flight'),
    -- HiveTyrant beats SwarmlordX
    ('d1000020-0000-0000-0000-000000000000', cid, u_ht, u_sx, f_hive, f_hive, f_hive, 'attacker_wins',
     u_ht, '2026-03-07 22:30:00+00', 'Moloch''s tendrils coil tighter — the Devourer Strain is consumed')
  ON CONFLICT (id) DO NOTHING;

  -- Round 6 — 14 Mar 2026
  INSERT INTO battles (id, campaign_id, attacker_player_id, defender_player_id,
    attacker_faction_id, defender_faction_id, winner_faction_id, result, logged_by, created_at, headline)
  VALUES
    -- NightPrince beats HiveTyrant (HT's one loss)
    ('d1000021-0000-0000-0000-000000000000', cid, u_np, u_ht, f_chaos, f_hive, f_chaos, 'attacker_wins',
     u_np, '2026-03-14 18:00:00+00', 'Sorcerer Aurelius finds his first victory in the shadows'),
    -- SwarmlordX beats NightPrince
    ('d1000022-0000-0000-0000-000000000000', cid, u_sx, u_np, f_hive, f_chaos, f_hive, 'attacker_wins',
     u_sx, '2026-03-14 19:30:00+00', 'The Swarmlord turns the sorcerer''s victory to ash'),
    -- HiveTyrant beats RogueMercenary
    ('d1000023-0000-0000-0000-000000000000', cid, u_ht, u_rm, f_hive, f_indie, f_hive, 'attacker_wins',
     u_ht, '2026-03-14 21:00:00+00', 'Iron Dogs overwhelmed — the biomass feeds the fleet'),
    -- SwarmlordX beats RogueMercenary
    ('d1000024-0000-0000-0000-000000000000', cid, u_sx, u_rm, f_hive, f_indie, f_hive, 'attacker_wins',
     u_sx, '2026-03-14 22:30:00+00', 'A hollow victory, but the points are real')
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Battles inserted. Inserting chronicle entries...';

  -- ── 10. Chronicle weekly updates (5 static entries) ───────────────────────
  -- Note: chronicle page requires login + membership. These appear in order,
  -- newest first. Content is JSONB: [{player_id, username, lines: string[]}]

  -- Entry 1: hobby_progress catch-up — all 8 armies deployed (Jan 2026)
  INSERT INTO chronicle_weekly_updates
    (id, campaign_id, update_type, week_start, week_end, is_catch_up, content)
  VALUES (
    'e1000001-0000-0000-0000-000000000000',
    cid, 'hobby_progress',
    '2026-01-15 00:00:00+00',
    '2026-02-06 23:59:59+00',
    true,
    jsonb_build_array(
      jsonb_build_object('player_id', u_kv, 'username', 'KaiserVon', 'lines', jsonb_build_array(
        jsonb_build_object('text', 'Deployed Steel Wardens for the opening round — full 50PL assembled and ready.', 'army_id', a_kv, 'army_name', 'Steel Wardens'),
        'Redemptor Dreadnought "Ironveil" received a fresh coat of Macragge Blue this week.'
      )),
      jsonb_build_object('player_id', u_wm, 'username', 'WardMaster9', 'lines', jsonb_build_array(
        jsonb_build_object('text', 'Order of the Vigilant take to the field — Terminators leading the charge.', 'army_id', a_wm, 'army_name', 'Order of the Vigilant'),
        'Terminator Squad Aurum finally based and varnished after two weeks on the painting desk.'
      )),
      jsonb_build_object('player_id', u_ht, 'username', 'HiveTyrant', 'lines', jsonb_build_array(
        jsonb_build_object('text', 'Hive Fleet Moloch awakens — the first splinter fleet emerges.', 'army_id', a_ht, 'army_name', 'Hive Fleet Moloch'),
        'Hive Tyrant magnetised and primed. Carnifex Brood assembled this week.'
      )),
      jsonb_build_object('player_id', u_sx, 'username', 'SwarmlordX', 'lines', jsonb_build_array(
        jsonb_build_object('text', 'Devourer Strain is on the table and hungry.', 'army_id', a_sx, 'army_name', 'Devourer Strain'),
        'The Swarmlord is painted. Genestealers WIP — about halfway through the batch.'
      )),
      jsonb_build_object('player_id', u_dp, 'username', 'DarkPatron', 'lines', jsonb_build_array(
        jsonb_build_object('text', 'Chosen of Brass bring the Word of Khorne to the league.', 'army_id', a_dp, 'army_name', 'Chosen of Brass'),
        'Berzerkers fully painted and based. Chaos Lord conversion finished last night.'
      )),
      jsonb_build_object('player_id', u_np, 'username', 'NightPrince', 'lines', jsonb_build_array(
        jsonb_build_object('text', 'Night''s Chosen emerge from the void — league commences.', 'army_id', a_np, 'army_name', 'Night''s Chosen'),
        'Sorcerer Aurelius converted from a Chaos Sorcerer kit — staff replaced with a custom staff of change.'
      )),
      jsonb_build_object('player_id', u_fa, 'username', 'FreeAgent', 'lines', jsonb_build_array(
        jsonb_build_object('text', 'Renegade Liberators report for duty — Omnissiah''s will be done.', 'army_id', a_fa, 'army_name', 'Renegade Liberators'),
        'Ironstrider Ballistarius assembled and primed. Skitarii Vanguard painted silver and rust.'
      )),
      jsonb_build_object('player_id', u_rm, 'username', 'RogueMercenary', 'lines', jsonb_build_array(
        jsonb_build_object('text', 'Iron Dogs Company ready to fight — and lose with dignity.', 'army_id', a_rm, 'army_name', 'Iron Dogs Company'),
        'Infantry Platoon painted in dark grey fatigues. Chimera "Rust Bucket" lives up to its name on the tabletop.'
      ))
    )
  )
  ON CONFLICT (campaign_id, update_type, week_start) DO NOTHING;

  -- Entry 2: hobby_progress — new units added (Feb 10)
  INSERT INTO chronicle_weekly_updates
    (id, campaign_id, update_type, week_start, week_end, is_catch_up, content)
  VALUES (
    'e1000002-0000-0000-0000-000000000000',
    cid, 'hobby_progress',
    '2026-02-09 00:00:00+00',
    '2026-02-15 23:59:59+00',
    false,
    jsonb_build_array(
      jsonb_build_object('player_id', u_kv, 'username', 'KaiserVon', 'lines', jsonb_build_array(
        'Redemptor Dreadnought "Ironveil" is now fully painted — highlight coat applied, decals done.',
        'Kill Team Sigma completed — five Phobos armour marines ready for deployment.'
      )),
      jsonb_build_object('player_id', u_ht, 'username', 'HiveTyrant', 'lines', jsonb_build_array(
        'Carnifex Brood "Crushers" finished — carapace in Leviathan Purple contrast.',
        'Ravener Pack assembled. These are fast on the table and a nightmare to paint.'
      )),
      jsonb_build_object('player_id', u_dp, 'username', 'DarkPatron', 'lines', jsonb_build_array(
        'Obliterators painted — went with a blended skin-and-metal look that took way too long.',
        'Chaos Rhino "Helltrack" assembled and base-coated. Blood-red over black.'
      ))
    )
  )
  ON CONFLICT (campaign_id, update_type, week_start) DO NOTHING;

  -- Entry 3: hobby_progress — painting updates (Feb 17)
  INSERT INTO chronicle_weekly_updates
    (id, campaign_id, update_type, week_start, week_end, is_catch_up, content)
  VALUES (
    'e1000003-0000-0000-0000-000000000000',
    cid, 'hobby_progress',
    '2026-02-16 00:00:00+00',
    '2026-02-22 23:59:59+00',
    false,
    jsonb_build_array(
      jsonb_build_object('player_id', u_kv, 'username', 'KaiserVon', 'lines', jsonb_build_array(
        'Eliminators Squad Phalanx complete — three models, three evenings, worth every minute.',
        'Scout Squad Phantom received their camo cloaks. Subtle greens over dark grey.'
      )),
      jsonb_build_object('player_id', u_ht, 'username', 'HiveTyrant', 'lines', jsonb_build_array(
        'Hormagaunt Swarm finished in a batch of 20 — contrast paints are a revelation.'
      )),
      jsonb_build_object('player_id', u_np, 'username', 'NightPrince', 'lines', jsonb_build_array(
        'Chaos Spawn conversion finished — three different kits cobbled into one wonderful abomination.',
        'Tzaangors based and highlight-washed. The pink-blue feathers came out surprisingly well.'
      )),
      jsonb_build_object('player_id', u_fa, 'username', 'FreeAgent', 'lines', jsonb_build_array(
        'Command Section painted — officer converted from a Skitarii Alpha with a pointing arm.'
      ))
    )
  )
  ON CONFLICT (campaign_id, update_type, week_start) DO NOTHING;

  -- Entry 4: army_progress — Crusade records (Mar 10)
  INSERT INTO chronicle_weekly_updates
    (id, campaign_id, update_type, week_start, week_end, is_catch_up, content)
  VALUES (
    'e1000004-0000-0000-0000-000000000000',
    cid, 'army_progress',
    '2026-03-09 00:00:00+00',
    '2026-03-15 23:59:59+00',
    false,
    jsonb_build_array(
      jsonb_build_object('player_id', u_kv, 'username', 'KaiserVon', 'lines', jsonb_build_array(
        jsonb_build_object('text', 'Steel Wardens logged +4 Crusade XP across this week''s battles.', 'army_id', a_kv, 'army_name', 'Steel Wardens'),
        'Strike Force Alpha earned the "Blooded" battle honour — three decisive engagements recorded.'
      )),
      jsonb_build_object('player_id', u_dp, 'username', 'DarkPatron', 'lines', jsonb_build_array(
        jsonb_build_object('text', 'Chosen of Brass receive the Boon of Khorne — a reward for four victories.', 'army_id', a_dp, 'army_name', 'Chosen of Brass'),
        'Chaos Lord "The Brass Patron" gains the Favoured of Khorne trait. His kill count grows.'
      )),
      jsonb_build_object('player_id', u_ht, 'username', 'HiveTyrant', 'lines', jsonb_build_array(
        jsonb_build_object('text', 'Hive Fleet Moloch records +3 Crusade XP — the bio-mass grows.', 'army_id', a_ht, 'army_name', 'Hive Fleet Moloch'),
        'Hive Tyrant "The Devouring Eye" earns the Warlord Trait: Synaptic Lynchpin.'
      )),
      jsonb_build_object('player_id', u_fa, 'username', 'FreeAgent', 'lines', jsonb_build_array(
        jsonb_build_object('text', 'Renegade Liberators log a Crusade Scar — the Ironstrider took critical damage.', 'army_id', a_fa, 'army_name', 'Renegade Liberators'),
        'Ironstrider Ballistarius: Battle Scar "Faulty Motivators" recorded. Movement reduced by 1" until repaired.'
      ))
    )
  )
  ON CONFLICT (campaign_id, update_type, week_start) DO NOTHING;

  -- Entry 5: army_progress — recent crusade updates (Apr 7)
  INSERT INTO chronicle_weekly_updates
    (id, campaign_id, update_type, week_start, week_end, is_catch_up, content)
  VALUES (
    'e1000005-0000-0000-0000-000000000000',
    cid, 'army_progress',
    '2026-04-06 00:00:00+00',
    '2026-04-12 23:59:59+00',
    false,
    jsonb_build_array(
      jsonb_build_object('player_id', u_kv, 'username', 'KaiserVon', 'lines', jsonb_build_array(
        jsonb_build_object('text', 'Redemptor Dreadnought "Ironveil" logs 3 kills in the final round — MVP of the Steel Wardens.', 'army_id', a_kv, 'army_name', 'Steel Wardens'),
        'Kill Team Sigma earns the "Headhunters" upgrade — promoted to Elite status after two clutch objective holds.'
      )),
      jsonb_build_object('player_id', u_dp, 'username', 'DarkPatron', 'lines', jsonb_build_array(
        jsonb_build_object('text', 'Berzerker Squad Omega of Chosen of Brass gains the "Relentless" battle trait.', 'army_id', a_dp, 'army_name', 'Chosen of Brass'),
        'The squad stormed objectives in three consecutive games without a single failed charge roll.'
      )),
      jsonb_build_object('player_id', u_np, 'username', 'NightPrince', 'lines', jsonb_build_array(
        jsonb_build_object('text', 'Sorcerer Aurelius of Night''s Chosen records his first league victory against the Tyranids.', 'army_id', a_np, 'army_name', 'Night''s Chosen'),
        'Aurelius gains the "Student of History" psychic upgrade — first win logged after five games.'
      )),
      jsonb_build_object('player_id', u_rm, 'username', 'RogueMercenary', 'lines', jsonb_build_array(
        jsonb_build_object('text', 'Iron Dogs Company ends the league winless — but with honour intact.', 'army_id', a_rm, 'army_name', 'Iron Dogs Company'),
        'Heavy Weapons Squad earns a Crusade Honour for "most dice rolled in a single activation" — unofficial, but acknowledged.'
      ))
    )
  )
  ON CONFLICT (campaign_id, update_type, week_start) DO NOTHING;

  RAISE NOTICE '✓ Home Game League seed complete!';
  RAISE NOTICE 'Standings: KaiserVon 16, DarkPatron 13, FreeAgent 13, HiveTyrant 11, WardMaster9 7, SwarmlordX 6, NightPrince 3, RogueMercenary 0';

END $$;

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM campaign_members cm
     JOIN campaigns c ON c.id = cm.campaign_id
    WHERE c.slug = 'home-game-league-anpa6') AS members,
  (SELECT count(*) FROM battles b
     JOIN campaigns c ON c.id = b.campaign_id
    WHERE c.slug = 'home-game-league-anpa6') AS battles,
  (SELECT count(*) FROM chronicle_weekly_updates cu
     JOIN campaigns c ON c.id = cu.campaign_id
    WHERE c.slug = 'home-game-league-anpa6') AS chronicle_entries;
-- Expected: members=8, battles=24, chronicle_entries=5
