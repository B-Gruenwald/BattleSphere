/**
 * POST /api/battles/link-to-campaign
 *
 * Creates a linked copy of a battle in a second campaign.
 *
 * Body: {
 *   battleId          : UUID — the original battle to copy
 *   targetCampaignId  : UUID — the campaign to link it to
 *   territoryId       : UUID | null — territory in the target campaign
 *   attackerFactionId : UUID — attacker faction in the target campaign
 *   defenderFactionId : UUID — defender faction in the target campaign
 * }
 *
 * The result, scores, chronicle, narratives, and army info all carry over from
 * the original.  Influence + event bonuses + territory cascade are applied to
 * the target campaign exactly as if the battle had been logged there directly.
 *
 * Returns: { battleId, battleUrl }
 */

import { createClient }      from '@/lib/supabase/server';
import {
  applyEventBonuses,
  applyTerritoryCascade,
} from '@/app/lib/influence';

// Inline influence application (mirrors BattleLogForm handleSubmit logic)
async function applyBaseInfluence(supabase, battle, campaign) {
  const mode = campaign.influence_mode ?? 'standard';
  if (mode === 'off') return;
  if (!battle.territory_id || !battle.attacker_faction_id || !battle.defender_faction_id) return;

  const isDraw      = !battle.winner_faction_id;
  const attackerWon = battle.winner_faction_id === battle.attacker_faction_id;

  const deltas = {};
  if (mode === 'standard') {
    if (isDraw) {
      deltas[battle.attacker_faction_id] = 2;
      deltas[battle.defender_faction_id] = 2;
    } else if (attackerWon) {
      deltas[battle.attacker_faction_id] = 3;
      deltas[battle.defender_faction_id] = 1;
    } else {
      deltas[battle.defender_faction_id] = 3;
      deltas[battle.attacker_faction_id] = 1;
    }
  } else if (mode === 'victory') {
    if (!isDraw) {
      const winnerId = attackerWon ? battle.attacker_faction_id : battle.defender_faction_id;
      deltas[winnerId] = 1;
    }
  }

  const factionIds = Object.keys(deltas);
  if (factionIds.length === 0) return;

  const { data: current } = await supabase
    .from('territory_influence')
    .select('*')
    .eq('territory_id', battle.territory_id)
    .in('faction_id', factionIds);

  const getPoints = (fid) =>
    (current || []).find(i => i.faction_id === fid)?.influence_points ?? 0;

  const updates = factionIds.map(fid => ({
    campaign_id:      battle.campaign_id,
    territory_id:     battle.territory_id,
    faction_id:       fid,
    influence_points: getPoints(fid) + deltas[fid],
  }));

  await supabase
    .from('territory_influence')
    .upsert(updates, { onConflict: 'territory_id,faction_id' });
}

// ── Entry point ───────────────────────────────────────────────────────────────
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorised.' }, { status: 401 });

  const body = await request.json();
  const { battleId, targetCampaignId, territoryId, attackerFactionId, defenderFactionId } = body;

  if (!battleId || !targetCampaignId || !attackerFactionId || !defenderFactionId) {
    return Response.json({ error: 'battleId, targetCampaignId, attackerFactionId, defenderFactionId are required.' }, { status: 400 });
  }

  // Fetch the original battle
  const { data: origRows } = await supabase
    .from('battles')
    .select('*')
    .eq('id', battleId)
    .limit(1);
  const original = origRows?.[0] ?? null;
  if (!original) return Response.json({ error: 'Battle not found.' }, { status: 404 });

  // Caller must be a participant
  const isAttacker = original.attacker_player_id === user.id;
  const isDefender = original.defender_player_id === user.id;
  if (!isAttacker && !isDefender) {
    return Response.json({ error: 'You are not a participant in this battle.' }, { status: 403 });
  }

  // Cannot link to the original campaign
  if (targetCampaignId === original.campaign_id) {
    return Response.json({ error: 'Cannot link a battle to its own campaign.' }, { status: 400 });
  }

  // Fetch the target campaign (validates it exists + gets influence_mode)
  const { data: campRows } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', targetCampaignId)
    .limit(1);
  const campaign = campRows?.[0] ?? null;
  if (!campaign) return Response.json({ error: 'Target campaign not found.' }, { status: 404 });

  // Verify caller is a member of the target campaign
  const { data: myMem } = await supabase
    .from('campaign_members')
    .select('role')
    .eq('campaign_id', targetCampaignId)
    .eq('user_id', user.id)
    .limit(1);
  if (!myMem?.[0] && campaign.organiser_id !== user.id) {
    return Response.json({ error: 'You are not a member of the target campaign.' }, { status: 403 });
  }

  // Remap winner: preserve attacker-won / defender-won / draw relative to the
  // new faction IDs.
  const isDraw      = !original.winner_faction_id;
  const attackerWon = original.winner_faction_id === original.attacker_faction_id;
  const newWinnerFactionId = isDraw
    ? null
    : attackerWon
      ? attackerFactionId
      : defenderFactionId;

  // Insert the linked battle
  const { data: newBattleRows, error: insertError } = await supabase
    .from('battles')
    .insert({
      campaign_id:          targetCampaignId,
      source_battle_id:     battleId,
      attacker_faction_id:  attackerFactionId,
      defender_faction_id:  defenderFactionId,
      winner_faction_id:    newWinnerFactionId,
      attacker_player_id:   original.attacker_player_id,
      defender_player_id:   original.defender_player_id,
      territory_id:         territoryId ?? null,
      attacker_score:       original.attacker_score,
      defender_score:       original.defender_score,
      battle_type:          original.battle_type,
      scenario:             original.scenario,
      headline:             original.headline,
      chronicle:            original.chronicle,
      narrative:            original.narrative,
      attacker_narrative:   original.attacker_narrative,
      defender_narrative:   original.defender_narrative,
      attacker_army_type:   original.attacker_army_type,
      defender_army_type:   original.defender_army_type,
      attacker_army_list:   original.attacker_army_list,
      defender_army_list:   original.defender_army_list,
      logged_by:            user.id,
    })
    .select('*');

  if (insertError) {
    console.error('link-to-campaign: insert error', insertError);
    return Response.json({ error: insertError.message }, { status: 500 });
  }

  const newBattle = newBattleRows?.[0];
  if (!newBattle) return Response.json({ error: 'Insert failed.' }, { status: 500 });

  // Apply influence + event bonuses + territory cascade for the target campaign.
  // applyEventBonuses must run BEFORE applyBaseInfluence so the influence state
  // check reflects the pre-battle territory state.
  await applyEventBonuses(supabase, newBattle);
  await applyBaseInfluence(supabase, newBattle, campaign);
  await applyTerritoryCascade(supabase, newBattle);

  return Response.json({
    battleId: newBattle.id,
    battleUrl: `/c/${campaign.slug}/battle/${newBattle.id}`,
  });
}
