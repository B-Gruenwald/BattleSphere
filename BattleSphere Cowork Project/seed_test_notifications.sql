-- ── Test notifications for benjamin.gruenwald@gmail.com ──────────────────────
-- Plain INSERT — no PL/pgSQL block, no DO $$, just a direct query.
-- Run in Supabase SQL Editor.

-- Remove previous test notifications before re-seeding
DELETE FROM user_notifications WHERE user_id = 'b2e54bde-7868-4250-9228-a43ba5b9da92'::uuid;

INSERT INTO user_notifications (user_id, type, title, body, link, metadata)

SELECT
  'b2e54bde-7868-4250-9228-a43ba5b9da92'::uuid,
  n.type, n.title, n.body,
  n.link,
  n.metadata::jsonb
FROM (VALUES

  ('onboarding_welcome',
   'Welcome to BattleSphere, Commander Benjamin!',
   'Your forces are mustered. Join a campaign, deploy your first army, or browse what other commanders are building.',
   '/dashboard',
   '{"tips":[{"label":"Browse campaigns","link":"/campaigns"},{"label":"Browse armies","link":"/armies"},{"label":"Deploy your army","link":"/armies/new"}]}'
  ),

  ('battle_opponent',
   -- Title: "[Organiser username] has reported your battle: [headline or 'an unnamed engagement']"
   (SELECT CONCAT(
      COALESCE((SELECT username FROM profiles WHERE id = c.organiser_id LIMIT 1), 'A player'),
      ' has reported your battle: ',
      COALESCE(
        (SELECT b.headline FROM battles b WHERE b.campaign_id = c.id AND b.headline IS NOT NULL AND b.headline <> '' ORDER BY b.created_at DESC LIMIT 1),
        'an unnamed engagement'
      )
    ) FROM campaigns c ORDER BY c.created_at DESC LIMIT 1),
   -- Body: "Faction A vs Faction B in Territory — result. Check the full report and add your own perspective."
   (SELECT CONCAT(
      COALESCE(f1.name, 'Unknown'), ' vs ', COALESCE(f2.name, 'Unknown'),
      ' in ', COALESCE(t.name, c.name),
      ' — ',
      CASE
        WHEN b.winner_faction_id = b.attacker_faction_id THEN COALESCE(f1.name, 'Unknown') || ' emerged victorious'
        WHEN b.winner_faction_id = b.defender_faction_id THEN COALESCE(f2.name, 'Unknown') || ' emerged victorious'
        ELSE 'the battle ended in a draw'
      END,
      '. Check the full report and add your own perspective.'
    )
    FROM campaigns c
    JOIN battles b ON b.campaign_id = c.id
    LEFT JOIN factions f1 ON f1.id = b.attacker_faction_id
    LEFT JOIN factions f2 ON f2.id = b.defender_faction_id
    LEFT JOIN territories t ON t.id = b.territory_id
    ORDER BY c.created_at DESC, b.created_at DESC LIMIT 1),
   (SELECT CONCAT('/c/', c.slug, '/battle/', b.id)
    FROM campaigns c JOIN battles b ON b.campaign_id = c.id
    ORDER BY c.created_at DESC, b.created_at DESC LIMIT 1),
   NULL
  ),

  ('achievement_awarded',
   'Achievement unlocked: Iron Will',
   (SELECT CONCAT('"Never broken, never fled." — Awarded in ', name, '.') FROM campaigns ORDER BY created_at DESC LIMIT 1),
   (SELECT CONCAT('/c/', slug, '/player/b2e54bde-7868-4250-9228-a43ba5b9da92') FROM campaigns ORDER BY created_at DESC LIMIT 1),
   NULL
  ),

  ('weekly_report',
   (SELECT CONCAT('Weekly Hobby & Crusade Report — ', name) FROM campaigns ORDER BY created_at DESC LIMIT 1),
   'Your weekly campaign update is ready. See which commanders deployed forces and earned battle honours.',
   (SELECT CONCAT('/c/', slug, '/chronicle') FROM campaigns ORDER BY created_at DESC LIMIT 1),
   NULL
  ),

  ('event_live',
   (SELECT CONCAT('Campaign Event is now active: ', COALESCE((SELECT name FROM campaign_events WHERE campaign_id = campaigns.id ORDER BY created_at DESC LIMIT 1), 'The Siege of Tertium Gate')) FROM campaigns ORDER BY created_at DESC LIMIT 1),
   (SELECT CONCAT('A new event has gone live in ', name, '. Check the conditions and see what''s at stake.') FROM campaigns ORDER BY created_at DESC LIMIT 1),
   (SELECT COALESCE(CONCAT('/c/', c.slug, '/events/', e.id), CONCAT('/c/', c.slug, '/events'))
    FROM campaigns c LEFT JOIN campaign_events e ON e.campaign_id = c.id
    ORDER BY c.created_at DESC, e.created_at DESC LIMIT 1),
   NULL
  ),

  ('onboarding_campaign',
   (SELECT CONCAT(name, ' is live — here''s what to do next') FROM campaigns ORDER BY created_at DESC LIMIT 1),
   'Share your public page to recruit players, set up the map, create Campaign Events, and let the narrative begin.',
   (SELECT CONCAT('/c/', slug) FROM campaigns ORDER BY created_at DESC LIMIT 1),
   (SELECT CONCAT('{"tips":[{"label":"Share public page","link":"/campaign/',slug,'"},{"label":"Invite players","link":"/c/',slug,'/admin"},{"label":"Edit the map","link":"/c/',slug,'/map"},{"label":"Create an event","link":"/c/',slug,'/events"}]}') FROM campaigns ORDER BY created_at DESC LIMIT 1)
  ),

  ('onboarding_army',
   'Your army is deployed — build it out!',
   'Add units, upload photos, record Crusade progress, and link your army to a campaign to start earning battle honours.',
   (SELECT COALESCE(CONCAT('/armies/', id, '/edit'), '/armies/new') FROM armies WHERE player_id = 'b2e54bde-7868-4250-9228-a43ba5b9da92'::uuid ORDER BY created_at DESC LIMIT 1),
   '{"tips":[{"label":"Add units","link":"/armies"},{"label":"Browse campaigns","link":"/campaigns"}]}'
  )

) AS n(type, title, body, link, metadata);
