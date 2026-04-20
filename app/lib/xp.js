/**
 * XP system helpers.
 *
 * XP is awarded for every battle regardless of whether a territory is at stake:
 *   Win  → +3 XP
 *   Draw → +2 XP
 *   Loss → +1 XP
 *
 * Territory battles additionally award any event_xp_bonus configured on an
 * active campaign event.
 *
 * XP is always additive and never decreases.
 */

export const XP_RANKS = [
  { minXP: 200, label: 'Legend' },
  { minXP: 100, label: 'Hero' },
  { minXP:  50, label: 'Champion' },
  { minXP:  25, label: 'Veteran' },
  { minXP:  10, label: 'Warrior' },
  { minXP:   0, label: 'Recruit' },
];

/**
 * Compute total XP for a player from a list of battles.
 * Battles must include: attacker_player_id, defender_player_id,
 * attacker_faction_id, defender_faction_id, winner_faction_id, territory_id,
 * event_xp_bonus.
 */
export function calcPlayerXP(battles, userId) {
  let xp = 0;
  for (const b of (battles || [])) {
    const isAttacker = b.attacker_player_id === userId;
    const isDefender = b.defender_player_id === userId;
    if (!isAttacker && !isDefender) continue;

    const isDraw    = b.winner_faction_id === null;
    const myFaction = isAttacker ? b.attacker_faction_id : b.defender_faction_id;
    const won       = !isDraw && b.winner_faction_id === myFaction;

    if (isDraw)    xp += 2;
    else if (won)  xp += 3;
    else           xp += 1; // loss

    // Event XP bonus only applies to territory battles
    if (b.territory_id) xp += b.event_xp_bonus || 0;
  }
  return xp;
}

/**
 * Return the rank label for a given XP total.
 */
export function getXPRank(xp) {
  for (const { minXP, label } of XP_RANKS) {
    if (xp >= minXP) return label;
  }
  return 'Recruit';
}
