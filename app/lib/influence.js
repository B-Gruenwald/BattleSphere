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
 *
 * applyEventBonuses checks all active events for the campaign, applies any
 * flat influence bonus to qualifying battles (both factions +bonus on the
 * battle's territory), and records what was applied in battle_event_bonuses
 * for clean reversal later.
 *
 * reverseEventBonuses reads battle_event_bonuses and undoes every bonus that
 * was recorded for a given battle, then clears the audit rows.
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

/**
 * Apply event-linked influence bonuses for a freshly logged battle.
 *
 * Fetches all active events for the campaign that have influence_bonus set,
 * checks each against the battle's territory / battle_type / factions (AND
 * logic — a null condition means "any"), and for each match:
 *   - Adds the flat bonus to territory_influence for BOTH factions
 *   - Writes a row to battle_event_bonuses for later reversal
 *   - Accumulates the total XP bonus to write back onto the battle record
 *
 * Only fires when the battle has a territory (influence needs a target).
 */
export async function applyEventBonuses(supabase, battle) {
  if (!battle.territory_id || !battle.attacker_faction_id || !battle.defender_faction_id) return;

  // Fetch active events with a bonus configured
  const { data: events } = await supabase
    .from('campaign_events')
    .select('*')
    .eq('campaign_id', battle.campaign_id)
    .eq('status', 'active')
    .not('influence_bonus', 'is', null);

  if (!events || events.length === 0) return;

  // Filter to events whose conditions all match this battle (AND logic)
  const matchingEvents = events.filter(ev => {
    if (ev.bonus_territory_id && ev.bonus_territory_id !== battle.territory_id) return false;
    if (ev.bonus_battle_type  && ev.bonus_battle_type  !== battle.battle_type)  return false;
    if (ev.bonus_faction_id) {
      const involvesFaction =
        ev.bonus_faction_id === battle.attacker_faction_id ||
        ev.bonus_faction_id === battle.defender_faction_id;
      if (!involvesFaction) return false;
    }
    return true;
  });

  if (matchingEvents.length === 0) return;

  const factionIds = [battle.attacker_faction_id, battle.defender_faction_id];

  // Fetch current influence rows for both factions on this territory
  const { data: current } = await supabase
    .from('territory_influence')
    .select('*')
    .eq('territory_id', battle.territory_id)
    .in('faction_id', factionIds);

  const getPoints = (fid) =>
    (current || []).find(i => i.faction_id === fid)?.influence_points ?? 0;

  let totalXpBonus = 0;

  for (const ev of matchingEvents) {
    const bonus = ev.influence_bonus;
    totalXpBonus += bonus;

    // Apply bonus to both factions on the territory
    const updates = factionIds.map(fid => ({
      campaign_id:      battle.campaign_id,
      territory_id:     battle.territory_id,
      faction_id:       fid,
      influence_points: getPoints(fid) + bonus,
    }));

    await supabase
      .from('territory_influence')
      .upsert(updates, { onConflict: 'territory_id,faction_id' });

    // Record the bonus for reversal
    await supabase
      .from('battle_event_bonuses')
      .upsert(
        { battle_id: battle.id, event_id: ev.id, bonus_amount: bonus },
        { onConflict: 'battle_id,event_id' }
      );
  }

  // Write the total XP bonus back onto the battle record
  if (totalXpBonus > 0) {
    await supabase
      .from('battles')
      .update({ event_xp_bonus: totalXpBonus })
      .eq('id', battle.id);
  }
}

/**
 * Reverse all event-linked influence bonuses for a battle that is being
 * deleted. Reads battle_event_bonuses, subtracts each bonus from
 * territory_influence (clamped at 0), then removes the audit rows and
 * resets event_xp_bonus on the battle.
 */
export async function reverseEventBonuses(supabase, battle) {
  if (!battle.territory_id || !battle.attacker_faction_id || !battle.defender_faction_id) return;

  const { data: bonusRows } = await supabase
    .from('battle_event_bonuses')
    .select('*')
    .eq('battle_id', battle.id);

  if (!bonusRows || bonusRows.length === 0) return;

  const factionIds = [battle.attacker_faction_id, battle.defender_faction_id];

  // Fetch current influence for both factions on this territory
  const { data: current } = await supabase
    .from('territory_influence')
    .select('*')
    .eq('territory_id', battle.territory_id)
    .in('faction_id', factionIds);

  const getPoints = (fid) =>
    (current || []).find(i => i.faction_id === fid)?.influence_points ?? 0;

  // Sum up total bonus to reverse across all matched events
  const totalBonus = bonusRows.reduce((sum, r) => sum + r.bonus_amount, 0);

  if (totalBonus > 0) {
    const updates = factionIds.map(fid => ({
      campaign_id:      battle.campaign_id,
      territory_id:     battle.territory_id,
      faction_id:       fid,
      influence_points: Math.max(0, getPoints(fid) - totalBonus),
    }));

    await supabase
      .from('territory_influence')
      .upsert(updates, { onConflict: 'territory_id,faction_id' });
  }

  // Clear the audit rows (cascade will handle this on battle delete, but
  // explicit cleanup is needed when the battle is being edited, not deleted)
  await supabase
    .from('battle_event_bonuses')
    .delete()
    .eq('battle_id', battle.id);

  // Reset XP bonus on the battle record
  await supabase
    .from('battles')
    .update({ event_xp_bonus: 0 })
    .eq('id', battle.id);
}
