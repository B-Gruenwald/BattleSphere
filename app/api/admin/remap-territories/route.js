// GET /api/admin/remap-territories
// One-time migration endpoint: redistributes all territory positions using
// the organic scatter layout and inserts warp routes for campaigns that lack them.
// Protected: only callable by a logged-in super-admin.

import { NextResponse } from 'next/server';
import { createClient }  from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// ── Scatter positions (mirrors scatterPos in campaign/new/page.js) ────────────
function scatterPos(count, cx, cy, rx, ry) {
  const positions = [];
  const minDist = Math.min(rx, ry) * Math.max(0.28, 1.3 / Math.sqrt(count));
  for (let i = 0; i < count; i++) {
    let x, y, tries = 0;
    do {
      const angle = Math.random() * 2 * Math.PI;
      const r = Math.sqrt(Math.random());
      x = Math.round((cx + rx * 0.88 * r * Math.cos(angle)) * 10) / 10;
      y = Math.round((cy + ry * 0.88 * r * Math.sin(angle)) * 10) / 10;
      tries++;
    } while (
      tries < 120 &&
      positions.some(p => Math.hypot(p.x - x, p.y - y) < minDist)
    );
    positions.push({ x, y });
  }
  return positions;
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

    // Generate new scatter positions
    const newPos = scatterPos(topLevel.length, 50, 50, 36, 28);

    // Build delta map
    const deltaById = {};
    topLevel.forEach((t, i) => {
      deltaById[t.id] = {
        dx: newPos[i].x - (t.x_pos ?? 50),
        dy: newPos[i].y - (t.y_pos ?? 50),
      };
    });

    // Update top-level positions
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

    // Shift sub-territories by the same delta as their parent
    let subOk = 0;
    for (const sub of children) {
      const delta = deltaById[sub.parent_id];
      if (!delta) continue; // depth-3 node whose parent is not a root — skip
      const newX = Math.round(((sub.x_pos ?? 50) + delta.dx) * 10) / 10;
      const newY = Math.round(((sub.y_pos ?? 50) + delta.dy) * 10) / 10;
      const { error } = await admin
        .from('territories')
        .update({ x_pos: newX, y_pos: newY })
        .eq('id', sub.id);
      if (!error) subOk++;
    }
    if (children.length > 0) note(`  ✓ Shifted ${subOk}/${children.length} sub-territories`);

    // Warp routes — insert only if none exist yet
    const { data: existingRoutes } = await admin
      .from('warp_routes')
      .select('id')
      .eq('campaign_id', campaign.id);

    if (existingRoutes && existingRoutes.length > 0) {
      note(`  ↩ Already has ${existingRoutes.length} warp route(s) — leaving untouched`);
    } else {
      const updatedTop = topLevel.map((t, i) => ({ ...t, x_pos: newPos[i].x, y_pos: newPos[i].y }));
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
