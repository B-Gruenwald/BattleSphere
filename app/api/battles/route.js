import { createClient }      from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/battles — insert a campaign-free battle
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();

  // Validate minimal required fields
  if (!body.attacker_player_id && !body.defender_player_id) {
    return Response.json({ error: 'At least one player is required.' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('battles')
    .insert({
      campaign_id:          null,
      logged_by:            user.id,
      headline:             body.headline             ?? null,
      battle_type:          body.battle_type          ?? null,
      scenario:             body.scenario             ?? null,
      attacker_player_id:   body.attacker_player_id   ?? null,
      defender_player_id:   body.defender_player_id   ?? null,
      attacker_faction_id:  null,
      defender_faction_id:  null,
      winner_faction_id:    null,
      winner_player_id:     body.winner_player_id     ?? null,
      attacker_score:       body.attacker_score       ?? 0,
      defender_score:       body.defender_score       ?? 0,
      attacker_army_type:   body.attacker_army_type   ?? null,
      defender_army_type:   body.defender_army_type   ?? null,
      attacker_narrative:   body.attacker_narrative   ?? null,
      defender_narrative:   body.defender_narrative   ?? null,
      notes:                body.notes                ?? null,
      army_id_p1:           body.army_id_p1           ?? null,
      army_id_p2:           body.army_id_p2           ?? null,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ battle: data });
}
