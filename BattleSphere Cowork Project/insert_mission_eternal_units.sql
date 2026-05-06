-- Insert all units for "Mission Eternal Chapter"
-- Uses a CTE to resolve the army_id by name — no manual ID hunting needed.
-- Safe to run multiple times only if the army currently has NO units (no duplicate guard).
-- If you want to re-run safely, add a DELETE first (see commented line below).

WITH army AS (
  SELECT id FROM armies WHERE name = 'Mission Eternal Chapter' LIMIT 1
),
units(name, unit_type, sort_order) AS (
  VALUES
    ('Company Commander Captain ISHMAEL (Gravis)',            'Captain in Gravis Armor',           1),
    ('Lieutenant EPHRAEM (Tactical)',                         'Lieutenant',                         2),
    ('Lieutenant SAMMAEL (Phobos)',                           'Lieutenant in Phobos Armor',         3),
    ('Librarian PHOTIC (Tactical)',                           'Librarian',                          4),
    ('Librarian KAIPHOS (Phobos)',                            'Librarian in Phobos Armor',          5),
    ('Apothecary Biologis NETANEL (Gravis)',                  'Apothecary Biologis',                6),
    ('Judiciar KAESTHOS',                                     'Judiciar',                           7),
    ('Champion MOURNOS',                                      'Lieutenant',                         8),
    ('Ancient ATHENOR',                                       'Ancient',                            9),
    ('Ballistus Dreadnought BEHEMATH',                        'Ballistus Dreadnought',             10),
    ('Redemptor Dreadnought THANATOS',                        'Redemptor Dreadnought',             11),
    ('(I) Veteran Squad PILUM (Sternguard Veterans)',         'Sternguard Veterans',               12),
    ('(II) Battleline Squad TORPOR (Intercessors)',           'Intercessor Squad',                 13),
    ('(III) Battleline Squad HAEDES (Infernus Marines)',      'Infernus Squad',                    14),
    ('(IV) Battleline Squad MORDENT',                         NULL,                                15),
    ('(V) Battleline Squad HANIKRAH (Heavy Intercessors)',    'Heavy Intercessor Squad',           16),
    ('(VI) Battleline Squad EREBOR (Infiltrators)',           'Infiltrator Squad',                 17),
    ('(VII) Close Support Squad MAKKABAE (Incursors)',        'Incursor Squad',                    18),
    ('(VIII) Close Support Squad NEGEVET (Assault Intercessors)', 'Assault Intercessor Squad',    19),
    ('(IX) Fire Support Squad KANAAN I-III (Eradicators, Suppressors)', 'Eradicators & Suppressors', 20),
    ('(X) Fire Support Squad EZEKIEL (Aggressors)',           'Aggressor Squad',                   21),
    ('Impulsor PORTANS',                                      'Impulsor',                          22),
    ('Land Raider FUROR',                                     'Land Raider',                       23),
    ('Chapter Master TELEPHTEO',                              'Captain in Terminator Armor',       24),
    ('Lord Chaplain DENTHOS',                                 'Chaplain in Terminator Armor',      25),
    ('Chief Librarian PROMETHOS',                             'Librarian in Terminator Armor',     26),
    ('(XI) Terminator Squad HAEDYRON (1st Company)',          'Terminator Squad',                  27),
    ('(XI) Terminator Assault Squad ASTRAPOS (1st Company)', 'Assault Terminator Squad',          28),
    ('(XI) Bladeguard Veterans AKKOR (1st Company)',          'Bladeguard Veterans',               29),
    ('(XX) Scout Squad DEMODRED (10th Company)',              'Scout Squad',                       30),
    ('(XX) Reivers MEGGIDON (10th Company)',                  'Reiver Squad',                      31),
    ('(XX) Eliminators SERPENS (10th Company)',               'Eliminators',                       32),
    ('(XX) Invictor Warsuits INDRAS & PARTHEMON (10th Company)', 'Invictor Warsuit',              33),
    ('Kill Team ALEPHO',                                      'Kill Team',                         34)
)
INSERT INTO army_units (army_id, name, unit_type, sort_order)
SELECT army.id, units.name, units.unit_type, units.sort_order
FROM army, units;

-- To verify after running:
-- SELECT name, unit_type, sort_order FROM army_units
-- WHERE army_id = (SELECT id FROM armies WHERE name = 'Mission Eternal Chapter')
-- ORDER BY sort_order;
