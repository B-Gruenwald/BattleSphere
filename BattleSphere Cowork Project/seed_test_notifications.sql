-- ── Test notifications for benjamin.gruenwald@gmail.com ──────────────────────
-- Plain INSERT — no PL/pgSQL block, no DO $$, just a direct query.
-- Run in Supabase SQL Editor.

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
   'A battle has been recorded — check the report',
   'Iron Warriors vs Space Wolves in Vespator Front — Iron Warriors won.',
   (SELECT CONCAT('/c/', slug, '/battle/', (SELECT id FROM battles WHERE campaign_id = campaigns.id ORDER BY created_at DESC LIMIT 1))
    FROM campaigns ORDER BY created_at DESC LIMIT 1),
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
