// GET /api/admin/remap-territories
// One-time migration endpoint: redistributes all territory positions using
// the organic scatter layout and inserts warp routes for campaigns that lack them.
// Protected: only callable by a logged-in super-admin.

import { NextResponse } from 'next/server';
import { createClient }  from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// ── Scatter positions (mirrors scatterPos in campaign/new/page.js) ────────────
// Grid-jitter: full canvas coverage, no clustering.
function scatterPos(count, x1, y1, x2, y2) {
  const ratio = (x2 - x1) / (y2 - y1);
  const cols  = Math.max(1, Math.round(Math.sqrt(count * ratio)));
  const rows  = Math.ceil(count / cols);
  const cellW = (x2 - x1) / cols;
  const cellH = (y2 - y1) / rows;

  const cells = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      cells.push({
        x: Math.round((x1 + (col + 0.15 + Math.random() * 0.7) * cellW) * 10) / 10,
        y: Math.round((y1 + (row + 0.15 + Math.random() * 0.7) * cellH) * 10) / 10,
      });
    }
  }
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return cells.slice(0, count);
}

// ── Nearest-neighbour warp route graph with connectivity guarantee ─────────────
function generateWarpRoutes(topLevelTerritories) {
  const n = topLevelTerritories.length;
  if (n < 2) return [];

  const edgeSet = new Set();
  const add = (i, j) => edgeSet.add([Math.min(i, j), Math.max(i, j)].join('-'));

  const connectPer = n <= 6 ? 3 : 2;
  for (let i = 0; i < n; i++) {
    const t = topLevelTerritories[i];
    topLevelTerritories
      .map((o, j) => ({ j, d: Math.hypot(o.x_pos - t.x_pos, o.y_pos - t.y_pos) }))
      .filter(({ j }) => j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, connectPer)
      .forEach(({ j }) => add(i, j));
  }

  const parent = topLevelTerritories.map((_, i) => i);
  const find = i => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const union = (i, j) => { parent[find(i)] = find(j); };
  [...edgeSet].forEach(k => { const [a, b] = k.split('-').map(Number); union(a, b); });
  for (let i = 1; i < n; i++) {
    if (find(i) !== find(0)) {
      const t = topLevelTerritories[i];
      let bestJ = 0, bestD = Infinity;
      for (let j = 0; j < n; j++) {
        if (j === i || find(j) !== find(0)) continue;
        const d = Math.hypot(topLevelTerritories[j].x_pos - t.x_pos, topLevelTerritories[j].y_pos - t.y_pos);
        if (d < bestD) { bestD = d; bestJ = j; }
      }
      add(i, bestJ);
      union(i, bestJ);
    }
  }

  return [...edgeSet].map(k => {
    const [a, b] = k.split('-').map(Number);
    return [topLevelTerritories[a].id, topLevelTerritories[b].id];
  });
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function GET() {
  // Auth check — must be a logged-in super-admin
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { data: profile } = await userClient.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Not authorised — super-admin only' }, { status: 403 });
  }

  const admin = createAdminClient();
  const log   = [];
  const note  = msg => { log.push(msg); console.log(msg); };

  // Fetch all campaigns
  const { data: campaigns, error: cErr } = await admin.from('campaigns').select('id, name');
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
  note(`Found ${campaigns.length} campaign(s)`);

  for (const campaign of campaigns) {
    note(`\n▸ ${campaign.name}`);

    const { data: territories, error: tErr } = await admin
      .from('territories')
      .select('*')
      .eq('campaign_id', campaign.id)
      .order('depth');
    if (tErr) { note(`  ✗ ${tErr.message}`); continue; }

    const topLevel = territories.filter(t => !t.parent_id);
    const children = territories.filter(t =>  t.parent_id);

    if (topLevel.length === 0) { note('  — No territories, skipping'); continue; }

    const newPos = scatterPos(topLevel.length, 10, 8, 90, 76);

    // ── Build a fresh position map for every territory ─────────────────────
    // Rather than delta-shifting (which preserves any historical bad positions),
    // recalculate all sub-territory positions from scratch based on their
    // parent's new position. Handles all depths correctly.

    const newPosMap = {};
    topLevel.forEach((t, i) => { newPosMap[t.id] = { x: newPos[i].x, y: newPos[i].y }; });

    // Group children by parent_id for quick lookup
    const byParent = {};
    children.forEach(t => {
      (byParent[t.parent_id] = byParent[t.parent_id] || []).push(t);
    });

    // Recursively assign orbital positions depth-by-depth.
    // depth-2: radius 9×7   depth-3: radius 4×3
    function assignOrbits(parentId, rx, ry) {
      const subs = byParent[parentId] || [];
      const px   = newPosMap[parentId]?.x ?? 50;
      const py   = newPosMap[parentId]?.y ?? 50;
      subs.forEach((sub, idx) => {
        const angle = (idx / subs.length) * 2 * Math.PI - Math.PI / 2;
        newPosMap[sub.id] = {
          x: Math.round((px + rx * Math.cos(angle)) * 10) / 10,
          y: Math.round((py + ry * Math.sin(angle)) * 10) / 10,
        };
        assignOrbits(sub.id, 4, 3); // depth-3 landmarks use tighter orbit
      });
    }
    topLevel.forEach(t => assignOrbits(t.id, 9, 7));

    // ── Write all positions to the database ─────────────────────────────────
    let topOk = 0;
    for (let i = 0; i < topLevel.length; i++) {
      const { error } = await admin
        .from('territories')
        .update({ x_pos: newPos[i].x, y_pos: newPos[i].y })
        .eq('id', topLevel[i].id);
      if (error) note(`  ✗ ${topLevel[i].name}: ${error.message}`);
      else topOk++;
    }
    note(`  ✓ Repositioned ${topOk}/${topLevel.length} top-level territories`);

    let subOk = 0;
    for (const sub of children) {
      const pos = newPosMap[sub.id];
      if (!pos) continue;
      const { error } = await admin
        .from('territories')
        .update({ x_pos: pos.x, y_pos: pos.y })
        .eq('id', sub.id);
      if (!error) subOk++;
    }
    if (children.length > 0) note(`  ✓ Recalculated ${subOk}/${children.length} sub-territory positions`);

    // Warp routes — insert only if none exist yet
    const { data: existingRoutes } = await admin
      .from('warp_routes')
      .select('id')
      .eq('campaign_id', campaign.id);

    if (existingRoutes && existingRoutes.length > 0) {
      note(`  ↩ Already has ${existingRoutes.length} warp route(s) — leaving untouched`);
    } else {
      const updatedTop = topLevel.map((t, i) => ({ ...t, x_pos: newPos[i].x, y_pos: newPos[i].y  }));
      const routePairs = generateWarpRoutes(updatedTop);
      const routeData  = routePairs.map(([idA, idB]) => {
        const [a, b] = [idA, idB].sort();
        return { campaign_id: campaign.id, territory_a: a, territory_b: b };
      });
      if (routeData.length > 0) {
        const { error: rErr } = await admin.from('warp_routes').insert(routeData);
        if (rErr) note(`  ✗ Warp routes: ${rErr.message}`);
        else note(`  ✓ Generated ${routeData.length} warp route(s)`);
      }
    }
  }

  note('\nDone.');
  return NextResponse.json({ ok: true, log }, { status: 200 });
}
