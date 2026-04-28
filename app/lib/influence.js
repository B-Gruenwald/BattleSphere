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
 * Determine the influence state of a territory for the Tier 2 event condition.
 *
 * Returns an object with three mutually exclusive boolean flags:
 *   isNeutral          — no rows, all zero, or multiple factions tied at the top
 *   winnerDominant     — the winning faction holds sole highest influence
 *   winnerNotDominant  — a different faction holds sole highest influence
 *
 * All three flags are false when:
 *   - The battle is a draw (no winner) AND the territory is not neutral
 *     (one faction leads but there's no winner to compare against).
 *
 * @param {Array}       allInfluence     Rows from territory_influence for this territory
 * @param {string|null} winnerFactionId  The winning faction, or null for a draw
 */
function computeInfluenceStateFlags(allInfluence, winnerFactionId) {
  if (!allInfluence || allInfluence.length === 0) {
    return { isNeutral: true, winnerDominant: false, winnerNotDominant: false };
  }

  const maxPoints = Math.max(...allInfluence.map(r => r.influence_points));
  if (maxPoints === 0) {
    return { isNeutral: true, winnerDominant: false, winnerNotDominant: false };
  }

  const leaders = allInfluence.filter(r => r.influence_points === maxPoints);
  if (leaders.length > 1) {
    // Tied at the top — treat as neutral
    return { isNeutral: true, winnerDominant: false, winnerNotDominant: false };
  }

  // One faction leads
  if (!winnerFactionId) {
    // Draw — no winner, so winner-relative states cannot apply
    return { isNeutral: false, winnerDominant: false, winnerNotDominant: false };
  }

  if (leaders[0].faction_id === winnerFactionId) {
    return { isNeutral: false, winnerDominant: true, winnerNotDominant: false };
  }

  return { isNeutral: false, winnerDominant: false, winnerNotDominant: true };
}

/**
 * Apply event-linked influence bonuses for a freshly logged battle.
 *
 * Fetches all active events for the campaign that have influence_bonus set,
 * checks each against the battle's territory / battle_type / factions /
 * influence_state (AND logic — a null condition means "any"), and for each match:
 *   - Adds the flat bonus to territory_influence for BOTH factions
 *   - Writes a row to battle_event_bonuses for later reversal
 *   - Accumulates the total XP bonus to write back onto the battle record
 *
 * Only fires when the battle has a territory (influence needs a target).
 *
 * IMPORTANT: This function must be called BEFORE base influence is applied so
 * that the influence state check reflects the pre-battle territory state.
 */
export async function applyEventBonuses(supabase, battle) {
  if (!battle.territory_id || !battle.attacker_faction_id || !battle.defender_faction_id) return;

  // Fetch active events with a bonus configured.
  // Also filter by date: exclude events that haven't started yet or have already ended.
  const now = new Date().toISOString();
  const { data: events } = await supabase
    .from('campaign_events')
    .select('*')
    .eq('campaign_id', battle.campaign_id)
    .eq('status', 'active')
    .not('influence_bonus', 'is', null)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`);

  if (!events || events.length === 0) return;

  // ── Influence state check (bonus_influence_states condition) ──────────────
  // Fetch ALL factions' influence on this territory so we can determine who
  // is dominant. This must be called before base influence is written.
  const { data: allTerritoryInfluence } = await supabase
    .from('territory_influence')
    .select('faction_id, influence_points')
    .eq('territory_id', battle.territory_id);

  const stateFlags = computeInfluenceStateFlags(allTerritoryInfluence, battle.winner_faction_id);

  // Filter to events whose conditions all match this battle.
  // AND logic across condition types; OR within each type (any one value matches).
  const matchingEvents = events.filter(ev => {
    const territories     = ev.bonus_territory_ids;
    const battleTypes     = ev.bonus_battle_types;
    const factionIds      = ev.bonus_faction_ids;
    const influenceStates = ev.bonus_influence_states;

    if (territories && territories.length > 0) {
      if (!territories.includes(battle.territory_id)) return false;
    }
    if (battleTypes && battleTypes.length > 0) {
      if (!battleTypes.includes(battle.battle_type)) return false;
    }
    if (factionIds && factionIds.length > 0) {
      const involvesFaction =
        factionIds.includes(battle.attacker_faction_id) ||
        factionIds.includes(battle.defender_faction_id);
      if (!involvesFaction) return false;
    }
    // Influence state condition — OR within the selected states
    if (influenceStates && influenceStates.length > 0) {
      const matches =
        (influenceStates.includes('neutral')             && stateFlags.isNeutral)        ||
        (influenceStates.includes('winner_dominant')     && stateFlags.winnerDominant)    ||
        (influenceStates.includes('winner_not_dominant') && stateFlags.winnerNotDominant);
      if (!matches) return false;
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
 * Apply Territory Cascade bonuses for a freshly logged battle (Tier 3).
 *
 * Checks all active events for the campaign that have a cascade_bonus and a
 * cascade_territory_id configured. A cascade fires when:
 *   • The battle is in the cascade territory itself, OR in a direct sub-territory
 *     of it (i.e. the battle territory's parent_id === cascade_territory_id).
 *   • The battle has a winner (draws never trigger a cascade).
 *
 * For each matching event the winning faction gains cascade_bonus influence in
 * every territory directly connected to cascade_territory_id via a warp route.
 * Each awarded territory is recorded in battle_cascade_bonuses for reversal.
 *
 * XP is not affected by the cascade.
 */
export async function applyTerritoryCascade(supabase, battle) {
  // No winner → no cascade.
  if (!battle.winner_faction_id) return;
  if (!battle.territory_id || !battle.campaign_id) return;

  // Fetch active events with a cascade configured.
  // Also filter by date: exclude events that haven't started yet or have already ended.
  const now = new Date().toISOString();
  const { data: events } = await supabase
    .from('campaign_events')
    .select('*')
    .eq('campaign_id', battle.campaign_id)
    .eq('status', 'active')
    .not('cascade_bonus', 'is', null)
    .not('cascade_territory_id', 'is', null)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`);

  if (!events || events.length === 0) return;

  // Fetch the battle territory so we can check its parent_id.
  const { data: battleTerritory } = await supabase
    .from('territories')
    .select('id, parent_id')
    .eq('id', battle.territory_id)
    .limit(1);

  const terr = battleTerritory?.[0] ?? null;
  if (!terr) return;

  // The "effective main territory" for cascade matching:
  //   • if the battle territory is top-level (no parent), use it directly.
  //   • if it's a sub-territory, use its parent.
  const effectiveMainId = terr.parent_id ?? terr.id;

  // Filter events whose cascade_territory_id matches the effective main territory.
  const matchingEvents = events.filter(ev => ev.cascade_territory_id === effectiveMainId);
  if (matchingEvents.length === 0) return;

  // Fetch all warp routes connected to this main territory.
  const { data: routes } = await supabase
    .from('warp_routes')
    .select('*')
    .eq('campaign_id', battle.campaign_id)
    .or(`territory_a.eq.${effectiveMainId},territory_b.eq.${effectiveMainId}`);

  if (!routes || routes.length === 0) return;

  // Collect the IDs of connected main territories.
  const connectedIds = routes.map(r =>
    r.territory_a === effectiveMainId ? r.territory_b : r.territory_a
  );
  if (connectedIds.length === 0) return;

  // Fetch current influence rows for the winning faction across all connected territories.
  const { data: current } = await supabase
    .from('territory_influence')
    .select('*')
    .in('territory_id', connectedIds)
    .eq('faction_id', battle.winner_faction_id);

  const getPoints = (tid) =>
    (current || []).find(i => i.territory_id === tid)?.influence_points ?? 0;

  for (const ev of matchingEvents) {
    const bonus = ev.cascade_bonus;

    // Apply bonus to winning faction in each connected territory.
    const updates = connectedIds.map(tid => ({
      campaign_id:      battle.campaign_id,
      territory_id:     tid,
      faction_id:       battle.winner_faction_id,
      influence_points: getPoints(tid) + bonus,
    }));

    await supabase
      .from('territory_influence')
      .upsert(updates, { onConflict: 'territory_id,faction_id' });

    // Record each awarded territory for later reversal.
    const auditRows = connectedIds.map(tid => ({
      battle_id:    battle.id,
      event_id:     ev.id,
      territory_id: tid,
      faction_id:   battle.winner_faction_id,
      bonus_amount: bonus,
    }));

    await supabase
      .from('battle_cascade_bonuses')
      .upsert(auditRows, { onConflict: 'battle_id,event_id,territory_id' });
  }
}

/**
 * Reverse Territory Cascade bonuses for a battle being deleted or re-evaluated.
 * Reads battle_cascade_bonuses, subtracts the bonus from each territory+faction
 * combination (clamped at 0), then removes the audit rows.
 */
export async function reverseTerritoryCascade(supabase, battle) {
  if (!battle.id) return;

  const { data: cascadeRows } = await supabase
    .from('battle_cascade_bonuses')
    .select('*')
    .eq('battle_id', battle.id);

  if (!cascadeRows || cascadeRows.length === 0) return;

  // Collect unique territory+faction pairs to fetch current influence.
  const pairs = cascadeRows.map(r => ({ territory_id: r.territory_id, faction_id: r.faction_id }));
  const territoryIds = [...new Set(pairs.map(p => p.territory_id))];
  const factionIds   = [...new Set(pairs.map(p => p.faction_id))];

  const { data: current } = await supabase
    .from('territory_influence')
    .select('*')
    .in('territory_id', territoryIds)
    .in('faction_id', factionIds);

  const getPoints = (tid, fid) =>
    (current || []).find(i => i.territory_id === tid && i.faction_id === fid)?.influence_points ?? 0;

  const updates = cascadeRows.map(r => ({
    campaign_id:      battle.campaign_id,
    territory_id:     r.territory_id,
    faction_id:       r.faction_id,
    influence_points: Math.max(0, getPoints(r.territory_id, r.faction_id) - r.bonus_amount),
  }));

  if (updates.length > 0) {
    await supabase
      .from('territory_influence')
      .upsert(updates, { onConflict: 'territory_id,faction_id' });
  }

  // Clear the audit rows.
  await supabase
    .from('battle_cascade_bonuses')
    .delete()
    .eq('battle_id', battle.id);
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
