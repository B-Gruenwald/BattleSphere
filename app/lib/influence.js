/**
 * Shared influence helpers.
 *
 * Influence modes:
 *   standard : Win → winner +3, loser +1 · Draw → both +2
 *   victory  : Win → winner +1 only · Draw and loss award nothing
 *   off      : No automatic influence; organiser manages manually
 *
 * reverseInfluence undoes the exact amounts that were awarded when a battle
 * was first logged, based on the campaign's current influence_mode.
 * Influence is clamped at 0 and never goes negative.
 */

export async function reverseInfluence(supabase, battle, mode = 'standard') {
  // Off mode: influence was never written automatically, nothing to reverse.
  if (mode === 'off') return;

  // If the battle had no territory or factions, no influence was ever applied.
  if (!battle.territory_id || !battle.attacker_faction_id || !battle.defender_faction_id) return;

  const isDraw      = !battle.winner_faction_id;
  const attackerWon = battle.winner_faction_id === battle.attacker_faction_id;

  // Build { factionId → pointsDelta } — the inverse of what was originally awarded.
  const factionDeltas = {};

  if (mode === 'standard') {
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
  } else if (mode === 'victory') {
    // Only the winner received +1; draws awarded nothing.
    if (!isDraw) {
      const winnerId = attackerWon ? battle.attacker_faction_id : battle.defender_faction_id;
      factionDeltas[winnerId] = -1;
    }
  }

  const factionIds = Object.keys(factionDeltas);
  if (factionIds.length === 0) return;

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
