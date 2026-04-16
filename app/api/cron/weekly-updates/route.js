/**
 * Weekly Chronicle Updates cron
 *
 * Runs every Friday at 08:00 (see vercel.json).
 * For each campaign it checks the previous Mon–Sun window and, if activity was
 * found, writes two possible chronicle entries:
 *
 *   hobby_progress  — new armies deployed to the campaign, new units added to
 *                     any army registered in the campaign.
 *
 *   army_progress   — crusade units newly enlisted, units whose stats were
 *                     updated (XP, kills, etc.), and army-level record updates.
 *
 * Results are upserted into chronicle_weekly_updates with a UNIQUE constraint
 * on (campaign_id, update_type, week_start), so the cron is safe to re-run.
 */

import { createAdminClient } from '@/lib/supabase/admin';

const CRON_SECRET = process.env.CRON_SECRET;

// ── Week window ───────────────────────────────────────────────────────────────
// Returns the Mon 00:00 UTC → Sun 23:59:59.999 UTC of the *previous* week.
// When the cron fires on a Friday this gives Mon–Sun of the week that just ended.
function getPreviousWeekRange() {
  const now = new Date();
  const dow = now.getUTCDay(); // 0 = Sun … 6 = Sat
  const daysSinceMon = dow === 0 ? 6 : dow - 1;

  // Monday 00:00 UTC of the current week
  const thisMonday = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - daysSinceMon,
    0, 0, 0, 0,
  ));

  const weekStart = new Date(thisMonday.getTime() - 7 * 24 * 60 * 60 * 1000); // Mon previous week
  const weekEnd   = new Date(thisMonday.getTime() - 1);                        // Sun 23:59:59.999

  return { weekStart, weekEnd };
}

// ── Entry point ───────────────────────────────────────────────────────────────
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorised.' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { weekStart, weekEnd } = getPreviousWeekRange();

  console.log(`weekly-updates cron: window ${weekStart.toISOString()} → ${weekEnd.toISOString()}`);

  // Fetch all campaigns
  const { data: campaigns, error: campErr } = await supabase
    .from('campaigns')
    .select('id, name');

  if (campErr) {
    console.error('weekly-updates: error fetching campaigns', campErr);
    return Response.json({ error: 'DB error.' }, { status: 500 });
  }

  let hobbyWritten = 0;
  let armyWritten  = 0;
  const errors = [];

  for (const campaign of (campaigns || [])) {
    try {
      await processCampaign(supabase, campaign, weekStart, weekEnd);
    } catch (err) {
      console.error(`weekly-updates: error for campaign ${campaign.id}`, err);
      errors.push({ campaignId: campaign.id, error: err.message });
      continue;
    }
  }

  console.log(`weekly-updates cron done. errors=${errors.length}`);
  return Response.json({ weekStart, weekEnd, errors });
}

// ── Per-campaign processing ───────────────────────────────────────────────────
async function processCampaign(supabase, campaign, weekStart, weekEnd) {
  const cid  = campaign.id;
  const wS   = weekStart.toISOString();
  const wE   = weekEnd.toISOString();

  // ── Fetch all campaign_army_records for this campaign ──────────────────────
  const { data: carRows } = await supabase
    .from('campaign_army_records')
    .select('id, army_id, player_id, created_at, updated_at')
    .eq('campaign_id', cid);

  if (!carRows || carRows.length === 0) return; // no armies in campaign

  const armyIds  = [...new Set(carRows.map(r => r.army_id))];
  const playerIds = [...new Set(carRows.map(r => r.player_id))];

  // ── Fetch army names ───────────────────────────────────────────────────────
  const { data: armies } = await supabase
    .from('armies')
    .select('id, name')
    .in('id', armyIds);
  const armyNameMap = Object.fromEntries((armies || []).map(a => [a.id, a.name]));

  // ── Fetch player usernames ─────────────────────────────────────────────────
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', playerIds);
  const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p.username ?? 'Unknown']));

  // Lookup helpers
  const armyToPlayer = Object.fromEntries(carRows.map(r => [r.army_id, r.player_id]));
  const carIdToPlayer = Object.fromEntries(carRows.map(r => [r.id, { player_id: r.player_id, army_id: r.army_id }]));
  const carIds = carRows.map(r => r.id);

  // ── ─────────────────────────────────────────────────────────────────────────
  // HOBBY PROGRESS
  // A) New campaign_army_records in window = "deployed army to campaign"
  // B) New army_units in window whose army is in this campaign = "added units"
  // ── ─────────────────────────────────────────────────────────────────────────

  const newArmyLinks = carRows.filter(r =>
    r.created_at >= wS && r.created_at <= wE,
  );

  const { data: newUnits } = await supabase
    .from('army_units')
    .select('id, army_id, name, created_at')
    .in('army_id', armyIds)
    .gte('created_at', wS)
    .lte('created_at', wE);

  // Build per-player hobby content
  const hobbyByPlayer = {};

  function ensureHobbyPlayer(pid) {
    if (!hobbyByPlayer[pid]) {
      hobbyByPlayer[pid] = {
        player_id: pid,
        username:  profileMap[pid] ?? 'Unknown',
        lines:     [],
      };
    }
  }

  for (const r of newArmyLinks) {
    ensureHobbyPlayer(r.player_id);
    const name = armyNameMap[r.army_id] ?? 'an army';
    hobbyByPlayer[r.player_id].lines.push(
      `Deployed ${name} to the campaign`,
    );
  }

  // Group new units by army
  const unitCountByArmy = {};
  for (const unit of (newUnits || [])) {
    unitCountByArmy[unit.army_id] = (unitCountByArmy[unit.army_id] ?? 0) + 1;
  }
  for (const [armyId, count] of Object.entries(unitCountByArmy)) {
    const pid = armyToPlayer[armyId];
    if (!pid) continue;
    ensureHobbyPlayer(pid);
    const armyName = armyNameMap[armyId] ?? 'their army';
    hobbyByPlayer[pid].lines.push(
      `Added ${count} new unit${count !== 1 ? 's' : ''} to ${armyName}`,
    );
  }

  const hobbyContent = Object.values(hobbyByPlayer).filter(p => p.lines.length > 0);

  // ── ─────────────────────────────────────────────────────────────────────────
  // ARMY PROGRESS
  // A) New crusade_unit_records in window = "enlisted units"
  // B) Updated crusade_unit_records (updated_at in window, created before) = "progressed units"
  // C) Updated campaign_army_records (updated_at in window, created before) = "army stats updated"
  // ── ─────────────────────────────────────────────────────────────────────────

  // All crusade records touched in the window (new or updated)
  const { data: crusadeTouched } = carIds.length > 0
    ? await supabase
        .from('crusade_unit_records')
        .select('id, campaign_army_record_id, player_id, created_at, updated_at')
        .in('campaign_army_record_id', carIds)
        .gte('updated_at', wS)
        .lte('updated_at', wE)
    : { data: [] };

  const newCrusadeUnits     = (crusadeTouched || []).filter(r => r.created_at >= wS);
  const updatedCrusadeUnits = (crusadeTouched || []).filter(r => r.created_at < wS);

  // Updated campaign_army_records (army-level stats changed)
  const updatedCarRows = carRows.filter(r =>
    r.updated_at >= wS && r.updated_at <= wE && r.created_at < wS,
  );

  // Build per-player army content
  const armyByPlayer = {};

  function ensureArmyPlayer(pid) {
    if (!armyByPlayer[pid]) {
      armyByPlayer[pid] = {
        player_id: pid,
        username:  profileMap[pid] ?? 'Unknown',
        lines:     [],
      };
    }
  }

  // Group by player
  const enlistedByPlayer = {};
  for (const r of newCrusadeUnits) {
    const pid = r.player_id;
    enlistedByPlayer[pid] = (enlistedByPlayer[pid] ?? 0) + 1;
  }
  for (const [pid, count] of Object.entries(enlistedByPlayer)) {
    ensureArmyPlayer(pid);
    armyByPlayer[pid].lines.push(
      `Enlisted ${count} unit${count !== 1 ? 's' : ''} to their Crusade force`,
    );
  }

  const progressedByPlayer = {};
  for (const r of updatedCrusadeUnits) {
    const pid = r.player_id;
    progressedByPlayer[pid] = (progressedByPlayer[pid] ?? 0) + 1;
  }
  for (const [pid, count] of Object.entries(progressedByPlayer)) {
    ensureArmyPlayer(pid);
    armyByPlayer[pid].lines.push(
      `Updated battle honours for ${count} unit${count !== 1 ? 's' : ''} (XP, kills, or upgrades)`,
    );
  }

  for (const r of updatedCarRows) {
    ensureArmyPlayer(r.player_id);
    const armyName = armyNameMap[r.army_id] ?? 'their army';
    armyByPlayer[r.player_id].lines.push(
      `Updated ${armyName}'s Crusade roster (supply, requisition, or notes)`,
    );
  }

  const armyContent = Object.values(armyByPlayer).filter(p => p.lines.length > 0);

  // ── Upsert results ─────────────────────────────────────────────────────────
  if (hobbyContent.length > 0) {
    const { error } = await supabase
      .from('chronicle_weekly_updates')
      .upsert(
        {
          campaign_id: cid,
          update_type: 'hobby_progress',
          week_start:  weekStart.toISOString(),
          week_end:    weekEnd.toISOString(),
          content:     hobbyContent,
        },
        { onConflict: 'campaign_id,update_type,week_start' },
      );
    if (error) console.error(`weekly-updates: upsert hobby for ${cid}`, error);
    else console.log(`weekly-updates: hobby_progress written for ${campaign.name}`);
  }

  if (armyContent.length > 0) {
    const { error } = await supabase
      .from('chronicle_weekly_updates')
      .upsert(
        {
          campaign_id: cid,
          update_type: 'army_progress',
          week_start:  weekStart.toISOString(),
          week_end:    weekEnd.toISOString(),
          content:     armyContent,
        },
        { onConflict: 'campaign_id,update_type,week_start' },
      );
    if (error) console.error(`weekly-updates: upsert army for ${cid}`, error);
    else console.log(`weekly-updates: army_progress written for ${campaign.name}`);
  }
}
