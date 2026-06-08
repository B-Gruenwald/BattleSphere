// app/admin/engagementScore.js
// Pure utility functions — no imports required.
// Called server-side in page.js files; results passed as plain data to client components.

// ─── Campaign score ───────────────────────────────────────────────────────────
// Max 100 pts.  Territory *count* deliberately excluded — it is auto-generated.
export function scoreCampaign(campaign, {
  memberCount,
  battles,       // [{ id, created_at }]
  territories,   // [{ id, image_url, description }]
  events,        // [{ id, created_at }]
  battlePhotos,  // [{ battle_id }]
}) {
  let score = 0

  // Territory images — someone actually uploaded artwork (+15)
  if (territories.some(t => t.image_url)) score += 15

  // Territory lore — 3+ territories with written descriptions (+10)
  if (territories.filter(t => t.description).length >= 3) score += 10

  // Campaign events created
  if (events.length >= 1) score += 5
  if (events.length >= 5) score += 10

  // Battles logged
  if (battles.length >= 3)  score += 5
  if (battles.length >= 10) score += 10

  // Battle photos — at least one battle has a photo (+10)
  if (battlePhotos.length >= 1) score += 10

  // Activity within the last 30 days (+15)
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  const allTimes = [
    ...battles.map(b => new Date(b.created_at).getTime()),
    ...events.map(e => new Date(e.created_at).getTime()),
  ]
  if (allTimes.length && Math.max(...allTimes) > cutoff) score += 15

  // Player count
  if (memberCount >= 3) score += 5
  if (memberCount >= 5) score += 10

  return Math.min(score, 100)
}

// ─── Army score ───────────────────────────────────────────────────────────────
// Max 100 pts.
export function scoreArmy(army, {
  unitCount,      // number
  unitPhotos,     // [{ army_unit_id, is_portrait }]
  isDeployed,     // boolean — has at least one campaign_army_record
  battleCount,    // number — battles where this army appears as army_id_p1 or _p2
}) {
  let score = 0

  // Written description / background story
  if (army.description) score += 10

  // Unit count (shows actual hobby work)
  if (unitCount >= 5)  score += 10
  if (unitCount >= 10) score += 15

  // Unit photos uploaded
  if (unitPhotos.length >= 1) score += 15

  // Portrait set on at least one unit
  if (unitPhotos.some(p => p.is_portrait)) score += 5

  // Deployed to at least one campaign
  if (isDeployed) score += 10

  // Appears in battle records
  if (battleCount >= 1) score += 10

  // Is public (willing to share)
  if (army.is_public) score += 5

  return Math.min(score, 100)
}

// ─── Battle score ─────────────────────────────────────────────────────────────
// Max 100 pts.
export function scoreBattle(battle, { photoCount }) {
  let score = 0

  // Has a battle headline / title
  if (battle.headline) score += 10

  // Has narrative text (either player's perspective)
  if (battle.attacker_narrative || battle.defender_narrative) score += 20

  // Photos
  if (photoCount >= 1) score += 20
  if (photoCount >= 3) score += 10

  // Linked to a specific army
  if (battle.army_id_p1 || battle.army_id_p2) score += 10

  // Linked to a territory (placed on the map)
  if (battle.territory_id) score += 10

  return Math.min(score, 100)
}

// ─── Activity status ──────────────────────────────────────────────────────────
// Returns { label, color, dot } based on last-active timestamp (ms since epoch or ISO string).
export function activityStatus(lastActiveIso) {
  if (!lastActiveIso) return { label: 'Unknown', color: '#555', dot: '⚫' }
  const ms = typeof lastActiveIso === 'number' ? lastActiveIso : new Date(lastActiveIso).getTime()
  const daysAgo = (Date.now() - ms) / (1000 * 60 * 60 * 24)
  if (daysAgo <= 14)  return { label: 'Active',  color: '#4ade80', dot: '🟢' }
  if (daysAgo <= 45)  return { label: 'Cooling', color: '#facc15', dot: '🟡' }
  return               { label: 'Dormant', color: '#f87171', dot: '🔴' }
}

// ─── Score display helpers ────────────────────────────────────────────────────
export function scoreColor(score) {
  if (score >= 70) return 'var(--text-gold)'
  if (score >= 40) return '#9ca3af'
  return '#555'
}

export function scoreBg(score) {
  if (score >= 70) return 'rgba(183,140,64,0.12)'
  if (score >= 40) return 'rgba(156,163,175,0.1)'
  return 'rgba(80,80,80,0.1)'
}
