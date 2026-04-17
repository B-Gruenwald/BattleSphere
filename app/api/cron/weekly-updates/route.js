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
 * First-run behaviour: if a campaign has never had a weekly update generated,
 * the window is expanded to cover all activity since the campaign was created
 * (a one-time catch-up entry labelled "Campaign History").
 *
 * Results are upserted into chronicle_weekly_updates with a UNIQUE constraint
 * on (campaign_id, update_type, week_start), so the cron is safe to re-run.
 */

import { createAdminClient } from '@/lib/supabase/admin';

const CRON_SECRET = process.env.CRON_SECRET;

// ── Week window ───────────────────────────────────────────────────────────────
// Returns the Mon 00:00 UTC → Sun 23:59:59.999 UTC of the *previous* week.
function getPreviousWeekRange() {
  const now = new Date();
  const dow = now.getUTCDay(); // 0 = Sun … 6 = Sat
  const daysSinceMon = dow === 0 ? 6 : dow - 1;

  const thisMonday = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - daysSinceMon,
    0, 0, 0, 0,
  ));

  const weekStart = new Date(thisMonday.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekEnd   = new Date(thisMonday.getTime() - 1);

  return { weekStart, weekEnd };
}

// ── Entry point ───────────────────────────────────────────────────────────────
// Add ?dry=true to see what would be written without actually writing anything.
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorised.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dryRun = searchParams.get('dry') === 'true';

  const supabase = createAdminClient();
  const defaultWindow = getPreviousWeekRange();

  // Fetch all existing weekly update rows so we can detect first-run campaigns
  const { data: existingUpdates, error: existingErr } = await supabase
    .from('chronicle_weekly_updates')
    .select('campaign_id, update_type');

  if (existingErr) {
    // Table might not exist yet
    return Response.json({ error: `chronicle_weekly_updates query failed: ${existingErr.message}` }, { status: 500 });
  }

  const campaignsWithUpdates = new Set(
    (existingUpdates || []).map(r => r.campaign_id),
  );

  // Fetch all campaigns (include created_at for catch-up window)
  const { data: campaigns, error: campErr } = await supabase
    .from('campaigns')
    .select('id, name, created_at');

  if (campErr) {
    return Response.json({ error: `campaigns query failed: ${campErr.message}` }, { status: 500 });
  }

  const results = [];
  const now = new Date();

  for (const campaign of (campaigns || [])) {
    let weekStart, weekEnd, isCatchUp;

    if (!campaignsWithUpdates.has(campaign.id)) {
      weekStart = new Date(campaign.created_at);
      weekEnd   = now;
      isCatchUp = true;
    } else {
      weekStart = defaultWindow.weekStart;
      weekEnd   = defaultWindow.weekEnd;
      isCatchUp = false;
    }

    const result = await processCampaign(supabase, campaign, weekStart, weekEnd, isCatchUp, dryRun);
    results.push({ campaign: campaign.name, isCatchUp, ...result });
  }

  return Response.json({ dryRun, defaultWindow, results });
}

// ── Per-campaign processing ───────────────────────────────────────────────────
async function processCampaign(supabase, campaign, weekStart, weekEnd, isCatchUp = false, dryRun = false) {
  const cid  = campaign.id;
  const wS   = weekStart.toISOString();
  const wE   = weekEnd.toISOString();

  // ── Fetch all campaign_army_records for this campaign ──────────────────────
  const { data: carRows, error: carErr } = await supabase
    .from('campaign_army_records')
    .select('id, army_id, player_id, created_at, updated_at')
    .eq('campaign_id', cid);

  if (carErr) return { skipped: `campaign_army_records error: ${carErr.message}` };
  if (!carRows || carRows.length === 0) return { skipped: 'no armies linked to campaign' };

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
  const summary = {
    window:      `${wS} → ${wE}`,
    hobbyLines:  hobbyContent.flatMap(p => p.lines.map(l => `${p.username}: ${l}`)),
    armyLines:   armyContent.flatMap(p => p.lines.map(l => `${p.username}: ${l}`)),
    errors:      [],
  };

  if (!dryRun) {
    if (hobbyContent.length > 0) {
      const { error } = await supabase
        .from('chronicle_weekly_updates')
        .upsert(
          {
            campaign_id:  cid,
            update_type:  'hobby_progress',
            week_start:   weekStart.toISOString(),
            week_end:     weekEnd.toISOString(),
            content:      hobbyContent,
            is_catch_up:  isCatchUp,
          },
          { onConflict: 'campaign_id,update_type,week_start' },
        );
      if (error) summary.errors.push(`hobby upsert: ${error.message}`);
    }

    if (armyContent.length > 0) {
      const { error } = await supabase
        .from('chronicle_weekly_updates')
        .upsert(
          {
            campaign_id:  cid,
            update_type:  'army_progress',
            week_start:   weekStart.toISOString(),
            week_end:     weekEnd.toISOString(),
            content:      armyContent,
            is_catch_up:  isCatchUp,
          },
          { onConflict: 'campaign_id,update_type,week_start' },
        );
      if (error) summary.errors.push(`army upsert: ${error.message}`);
    }
  }

  return summary;
}
