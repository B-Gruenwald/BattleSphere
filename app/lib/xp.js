/**
 * XP system helpers.
 *
 * XP mirrors the influence rules exactly:
 *   Win  on a territory → +3 XP
 *   Draw on a territory → +2 XP
 *   Loss on a territory → +1 XP
 *   No territory        → 0 XP
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
 * attacker_faction_id, defender_faction_id, winner_faction_id, territory_id.
 */
export function calcPlayerXP(battles, userId) {
  let xp = 0;
  for (const b of (battles || [])) {
    // Influence only applies when a territory is at stake
    if (!b.territory_id) continue;

    const isAttacker = b.attacker_player_id === userId;
    const isDefender = b.defender_player_id === userId;
    if (!isAttacker && !isDefender) continue;

    const isDraw    = b.winner_faction_id === null;
    const myFaction = isAttacker ? b.attacker_faction_id : b.defender_faction_id;
    const won       = !isDraw && b.winner_faction_id === myFaction;

    if (isDraw)    xp += 2;
    else if (won)  xp += 3;
    else           xp += 1; // loss
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
