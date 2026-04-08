/**
 * Shared influence helpers.
 *
 * Influence rules (matches BattleLogForm.updateInfluence):
 *   Win  → winner +3, loser +1
 *   Draw → both factions +2
 *
 * reverseInfluence undoes those exact amounts when a battle is deleted.
 * Influence is clamped at 0 and never goes negative.
 */

export async function reverseInfluence(supabase, battle) {
  // If the battle had no territory or factions, no influence was ever applied.
  if (!battle.territory_id || !battle.attacker_faction_id || !battle.defender_faction_id) return;

  const isDraw      = !battle.winner_faction_id;
  const attackerWon = battle.winner_faction_id === battle.attacker_faction_id;

  // Build a map of { factionId → pointsDelta }
  // Mirrors the inverse of BattleLogForm.updateInfluence:
  //   Win  → winner −3, loser −1
  //   Draw → both −2
  const factionDeltas = {};
  if (isDraw) {
    factionDeltas[battle.attacker_faction_id] = -2;
    factionDeltas[battle.defender_faction_id] = -2;
  } else if (attackerWon) {
    factionDeltas[battle.attacker_faction_id] = -3;
    factionDeltas[battle.defender_faction_id] = -1;
  } else {
    factionDeltas[battle.defender_faction_id] = -3;
    factionDeltas[battle.attacker_faction_id] = -1;
  }

  const factionIds = Object.keys(factionDeltas);

  // Fetch current influence rows for these factions on this territory
  const { data: current } = await supabase
    .from('territory_influence')
    .select('*')
    .eq('territory_id', battle.territory_id)
    .in('faction_id', factionIds);

  // Nothing in the DB to reverse
  if (!current || current.length === 0) return;

  const getPoints = (fid) =>
    (current.find(i => i.faction_id === fid)?.influence_points) ?? 0;

  // Only touch rows that actually exist; clamp at 0
  const updates = factionIds
    .filter(fid => current.find(i => i.faction_id === fid))
    .map(fid => ({
      campaign_id:      battle.campaign_id,
      territory_id:     battle.territory_id,
      faction_id:       fid,
      influence_points: Math.max(0, getPoints(fid) + factionDeltas[fid]),
    }));

  if (updates.length === 0) return;

  await supabase
    .from('territory_influence')
    .upsert(updates, { onConflict: 'territory_id,faction_id' });
}
