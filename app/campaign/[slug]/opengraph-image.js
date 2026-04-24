import { ImageResponse } from 'next/og';
import { createAdminClient } from '@/lib/supabase/admin';
import fs from 'fs';
import path from 'path';

// Rendered at /campaign/[slug]/opengraph-image
// The live campaign map is re-rendered server-side as a static SVG and used as
// the full-bleed background. Campaign name + stats are overlaid at the bottom.

export const runtime     = 'nodejs';
export const alt         = 'BattleSphere Campaign';
export const size        = { width: 1200, height: 630 };
export const contentType = 'image/png';

// ── Brand palette ────────────────────────────────────────────────────────────
const BG_VOID    = '#0a0a0f';
const GOLD       = '#b78c40';
const GOLD_BRT   = '#d4a853';
const TEXT_PRI   = '#e8e0d0';
const TEXT_SEC   = '#a09880';
const TEXT_MUT   = '#5a5445';
const BORDER_DIM = 'rgba(255,255,255,0.09)';
const NEUTRAL_COL = '#b78c40';

function trunc(str, max) {
  if (!str) return '';
  return str.length <= max ? str : str.slice(0, max - 1) + '…';
}

function escXml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Map maths (ported from CampaignMap.js) ───────────────────────────────────

function buildConnections(nodes) {
  const n = nodes.length;
  if (n < 2) return [];
  const edges = new Set();
  const add = (a, b) => {
    const key = [Math.min(a, b), Math.max(a, b)].join('-');
    edges.add(key);
  };
  for (let i = 0; i < n; i++) add(i, (i + 1) % n);
  if (n >= 6)  for (let i = 0; i < n; i += 3) add(i, (i + Math.floor(n / 2)) % n);
  if (n >= 10) for (let i = 1; i < n; i += 4) add(i, (i + Math.floor(n / 3)) % n);
  return [...edges].map(k => k.split('-').map(Number));
}

function separateNodes(nodes, minDist, iterations = 150, bx1 = 12, bx2 = 88, by1 = 12, by2 = 78) {
  if (nodes.length < 2) return nodes;
  const pts = nodes.map((n, i) => ({ ...n, x_pos: n.x_pos + i * 0.05, y_pos: n.y_pos + i * 0.03 }));
  for (let iter = 0; iter < iterations; iter++) {
    let maxMove = 0;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx   = pts[j].x_pos - pts[i].x_pos;
        const dy   = pts[j].y_pos - pts[i].y_pos;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          const nx   = dist > 0.0001 ? dx / dist : 1;
          const ny   = dist > 0.0001 ? dy / dist : 0;
          const push = (minDist - dist) / 2;
          pts[i].x_pos -= nx * push;
          pts[i].y_pos -= ny * push;
          pts[j].x_pos += nx * push;
          pts[j].y_pos += ny * push;
          maxMove = Math.max(maxMove, push);
        }
      }
    }
    for (const p of pts) {
      p.x_pos = Math.max(bx1, Math.min(bx2, p.x_pos));
      p.y_pos = Math.max(by1, Math.min(by2, p.y_pos));
    }
    if (maxMove < 0.01) break;
  }
  return pts;
}

function normalizePositions(territories) {
  const positioned = territories.filter(t => t.x_pos != null && t.y_pos != null);
  const X1 = 8, X2 = 92, Y1 = 8, Y2 = 83;
  const safeCx = (X1 + X2) / 2;
  const safeCy = (Y1 + Y2) / 2;

  if (positioned.length === 0) {
    const n = territories.length || 1;
    return territories.map((t, i) => {
      const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
      return { ...t, x_pos: Math.round((safeCx + 28 * Math.cos(angle)) * 10) / 10, y_pos: Math.round((safeCy + 22 * Math.sin(angle)) * 10) / 10 };
    });
  }

  const xs = positioned.map(t => t.x_pos);
  const ys = positioned.map(t => t.y_pos);
  const rawMinX = Math.min(...xs), rawMaxX = Math.max(...xs);
  const rawMinY = Math.min(...ys), rawMaxY = Math.max(...ys);
  const dataW = rawMaxX - rawMinX || 1;
  const dataH = rawMaxY - rawMinY || 1;
  const scale = Math.min(1, (X2 - X1) / dataW, (Y2 - Y1) / dataH);
  const rawCx = (rawMinX + rawMaxX) / 2;
  const rawCy = (rawMinY + rawMaxY) / 2;
  const tx = x => Math.round((safeCx + (x - rawCx) * scale) * 10) / 10;
  const ty = y => Math.round((safeCy + (y - rawCy) * scale) * 10) / 10;

  let nullTopIdx = 0;
  let result = territories.map(t => {
    if (t.x_pos != null && t.y_pos != null) return { ...t, x_pos: tx(t.x_pos), y_pos: ty(t.y_pos) };
    if (!t.parent_id) {
      const off = (nullTopIdx++) * 0.15;
      return { ...t, x_pos: safeCx + off, y_pos: safeCy + off };
    }
    return { ...t, x_pos: null, y_pos: null, _place: true };
  });

  result = result.map(t => {
    if (!t._place) return t;
    const parent   = result.find(p => p.id === t.parent_id);
    const px       = parent?.x_pos ?? safeCx;
    const py       = parent?.y_pos ?? safeCy;
    const nPlaced  = result.filter(s => s.parent_id === t.parent_id && !s._place && s.id !== t.id).length;
    const angle    = (nPlaced / Math.max(nPlaced + 1, 1)) * 2 * Math.PI - Math.PI / 2;
    const { _place, ...rest } = t;
    return { ...rest, x_pos: Math.round((px + 9 * Math.cos(angle)) * 10) / 10, y_pos: Math.round((py + 7 * Math.sin(angle)) * 10) / 10 };
  });

  const topBefore = result.filter(t => !t.parent_id);
  const topAfter  = separateNodes(topBefore, 12);
  const deltaById = {};
  topBefore.forEach((t, i) => { deltaById[t.id] = { dx: topAfter[i].x_pos - t.x_pos, dy: topAfter[i].y_pos - t.y_pos }; });

  result = result.map(t => {
    if (!t.parent_id) { const d = deltaById[t.id]; return { ...t, x_pos: t.x_pos + d.dx, y_pos: t.y_pos + d.dy }; }
    const d = deltaById[t.parent_id];
    if (d) return { ...t, x_pos: t.x_pos + d.dx, y_pos: t.y_pos + d.dy };
    return t;
  });

  const parentIds = [...new Set(result.filter(t => t.parent_id).map(t => t.parent_id))];
  parentIds.forEach(pid => {
    const idxs = result.reduce((acc, t, i) => { if (t.parent_id === pid) acc.push(i); return acc; }, []);
    if (idxs.length < 2) return;
    const separated = separateNodes(idxs.map(i => result[i]), 5, 80, 2, 98, 2, 96);
    idxs.forEach((idx, i) => { result[idx] = { ...result[idx], x_pos: separated[i].x_pos, y_pos: separated[i].y_pos }; });
  });

  return result;
}

function dominantFactionId(territory, allTerritories, influenceData) {
  const agg = {};
  influenceData.filter(i => i.territory_id === territory.id).forEach(i => {
    agg[i.faction_id] = (agg[i.faction_id] || 0) + i.influence_points;
  });
  if (territory.depth === 1 || !territory.parent_id) {
    const subs = allTerritories.filter(t => t.parent_id === territory.id);
    subs.forEach(sub => {
      influenceData.filter(i => i.territory_id === sub.id).forEach(i => {
        agg[i.faction_id] = (agg[i.faction_id] || 0) + i.influence_points * 0.5;
      });
    });
  }
  const entries = Object.entries(agg).filter(([, pts]) => pts > 0);
  if (entries.length === 0) return territory.controlling_faction_id || null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

// ── Build the map as a static SVG string ────────────────────────────────────
function buildMapSvg(territories, factions, warpRoutes, influenceData, setting, W, H) {
  const normalized  = normalizePositions(territories);
  const topLevel    = normalized.filter(t => !t.parent_id);
  const subLevel    = normalized.filter(t =>  t.parent_id);

  const factionColour = Object.fromEntries((factions || []).map(f => [f.id, f.colour]));

  // Build warp-route connections
  const connections = warpRoutes && warpRoutes.length > 0
    ? warpRoutes
        .map(r => [topLevel.find(t => t.id === r.territory_a), topLevel.find(t => t.id === r.territory_b)])
        .filter(([a, b]) => a && b)
    : buildConnections(topLevel).map(([a, b]) => [topLevel[a], topLevel[b]]);

  // Map percentage coords → SVG pixel coords
  const px = x => (x / 100) * W;
  const py = y => (y / 100) * H;

  // Theme
  const THEMES = {
    'Gothic Sci-Fi': { bg: '#060608', grid: 'rgba(183,140,64,0.06)' },
    'Space Opera':   { bg: '#04050e', grid: 'rgba(100,140,220,0.06)' },
    'High Fantasy':  { bg: '#060a06', grid: 'rgba(80,160,80,0.06)'  },
    'Historical':    { bg: '#080706', grid: 'rgba(180,140,80,0.06)' },
  };
  const theme = THEMES[setting] || THEMES['Gothic Sci-Fi'];

  const GW = W / 24;  // grid cell width
  const GH = H / 16;  // grid cell height

  const parts = [];

  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);

  // Background
  parts.push(`<rect width="${W}" height="${H}" fill="${escXml(theme.bg)}"/>`);

  // Grid
  parts.push(`<defs><pattern id="g" width="${GW}" height="${GH}" patternUnits="userSpaceOnUse"><path d="M ${GW} 0 L 0 0 0 ${GH}" fill="none" stroke="${escXml(theme.grid)}" stroke-width="0.5"/></pattern></defs>`);
  parts.push(`<rect width="${W}" height="${H}" fill="url(#g)"/>`);

  // Sub-territory connector lines (to parent)
  for (const t of subLevel) {
    const parent = normalized.find(p => p.id === t.parent_id);
    if (!parent || t.x_pos == null || t.y_pos == null || parent.x_pos == null || parent.y_pos == null) continue;
    parts.push(`<line x1="${px(parent.x_pos).toFixed(1)}" y1="${py(parent.y_pos).toFixed(1)}" x2="${px(t.x_pos).toFixed(1)}" y2="${py(t.y_pos).toFixed(1)}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`);
  }

  // Warp-route lines (top-level connections)
  for (const [a, b] of connections) {
    if (a.x_pos == null || b.x_pos == null) continue;
    parts.push(`<line x1="${px(a.x_pos).toFixed(1)}" y1="${py(a.y_pos).toFixed(1)}" x2="${px(b.x_pos).toFixed(1)}" y2="${py(b.y_pos).toFixed(1)}" stroke="rgba(255,255,255,0.16)" stroke-width="2" stroke-dasharray="5,7"/>`);
  }

  // Sub-territory nodes (small circles)
  for (const t of subLevel) {
    if (t.x_pos == null || t.y_pos == null) continue;
    const domId = dominantFactionId(t, normalized, influenceData);
    const col   = domId ? (factionColour[domId] || NEUTRAL_COL) : NEUTRAL_COL;
    const cx    = px(t.x_pos).toFixed(1);
    const cy    = py(t.y_pos).toFixed(1);
    // Glow halo
    parts.push(`<circle cx="${cx}" cy="${cy}" r="10" fill="${escXml(col)}" opacity="0.08"/>`);
    // Node
    parts.push(`<circle cx="${cx}" cy="${cy}" r="6" fill="${escXml(col)}" opacity="0.75"/>`);
    parts.push(`<circle cx="${cx}" cy="${cy}" r="6" fill="none" stroke="${escXml(col)}" stroke-width="1.5" opacity="0.6"/>`);
    // Small label
    const labelX = cx;
    const labelY = (py(t.y_pos) + 20).toFixed(1);
    parts.push(`<text x="${labelX}" y="${labelY}" text-anchor="middle" fill="rgba(232,224,208,0.55)" font-size="10" font-family="Georgia,serif" letter-spacing="0.5">${escXml(t.name)}</text>`);
  }

  // Top-level territory nodes (diamonds)
  for (const t of topLevel) {
    if (t.x_pos == null || t.y_pos == null) continue;
    const domId = dominantFactionId(t, normalized, influenceData);
    const col   = domId ? (factionColour[domId] || NEUTRAL_COL) : NEUTRAL_COL;
    const cx    = px(t.x_pos);
    const cy    = py(t.y_pos);
    const dh    = 16;   // half-height of diamond
    const dw    = 12;   // half-width of diamond
    const pts   = `${cx.toFixed(1)},${(cy - dh).toFixed(1)} ${(cx + dw).toFixed(1)},${cy.toFixed(1)} ${cx.toFixed(1)},${(cy + dh).toFixed(1)} ${(cx - dw).toFixed(1)},${cy.toFixed(1)}`;

    // Outer glow
    parts.push(`<polygon points="${pts}" fill="${escXml(col)}" opacity="0.12"/>`);
    // Fill
    parts.push(`<polygon points="${pts}" fill="${escXml(col)}" opacity="0.82"/>`);
    // Outline
    parts.push(`<polygon points="${pts}" fill="none" stroke="${escXml(col)}" stroke-width="2" opacity="0.95"/>`);
    // Inner shine
    const innerPts = `${cx.toFixed(1)},${(cy - dh * 0.5).toFixed(1)} ${(cx + dw * 0.5).toFixed(1)},${cy.toFixed(1)} ${cx.toFixed(1)},${(cy + dh * 0.5).toFixed(1)} ${(cx - dw * 0.5).toFixed(1)},${cy.toFixed(1)}`;
    parts.push(`<polygon points="${innerPts}" fill="rgba(255,255,255,0.12)"/>`);

    // Territory name label
    const labelY = (cy + dh + 16).toFixed(1);
    parts.push(`<text x="${cx.toFixed(1)}" y="${labelY}" text-anchor="middle" fill="rgba(232,224,208,0.8)" font-size="12" font-family="Georgia,serif" letter-spacing="1">${escXml(t.name)}</text>`);
  }

  parts.push('</svg>');
  return parts.join('');
}

// ── Main OG renderer ─────────────────────────────────────────────────────────
export default async function OgImage({ params }) {
  const { slug } = await params;
  const admin = createAdminClient();

  // ── Fonts ──────────────────────────────────────────────────────────────────
  const cinzel400 = fs.readFileSync(path.join(process.cwd(), 'public/fonts/Cinzel-400.woff'));
  const cinzel700 = fs.readFileSync(path.join(process.cwd(), 'public/fonts/Cinzel-700.woff'));
  const cinzel900 = fs.readFileSync(path.join(process.cwd(), 'public/fonts/Cinzel-900.woff'));
  const fontOptions = {
    fonts: [
      { name: 'Cinzel', data: cinzel400, weight: 400, style: 'normal' },
      { name: 'Cinzel', data: cinzel700, weight: 700, style: 'normal' },
      { name: 'Cinzel', data: cinzel900, weight: 900, style: 'normal' },
    ],
  };

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data: campRows } = await admin.from('campaigns').select('*').eq('slug', slug).limit(1);
  const campaign = campRows?.[0] ?? null;

  if (!campaign) {
    return new ImageResponse(
      (
        <div style={{ width: 1200, height: 630, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: BG_VOID, fontFamily: 'Cinzel' }}>
          <div style={{ fontSize: 32, letterSpacing: 8, textTransform: 'uppercase', color: GOLD }}>BattleSphere</div>
        </div>
      ),
      { ...size, ...fontOptions }
    );
  }

  const [
    { data: factions },
    { data: territories },
    { data: influenceData },
    { data: warpRoutes },
    { count: memberCount },
    { count: battleCount },
  ] = await Promise.all([
    admin.from('factions').select('*').eq('campaign_id', campaign.id),
    admin.from('territories').select('*').eq('campaign_id', campaign.id).order('depth').order('created_at'),
    admin.from('territory_influence').select('faction_id, territory_id, influence_points').eq('campaign_id', campaign.id),
    admin.from('warp_routes').select('territory_a, territory_b').eq('campaign_id', campaign.id),
    admin.from('campaign_members').select('*', { count: 'exact', head: true }).eq('campaign_id', campaign.id),
    admin.from('battles').select('*', { count: 'exact', head: true }).eq('campaign_id', campaign.id),
  ]);

  const isLeague     = campaign.campaign_format === 'league';
  const campaignName = trunc(campaign.name || 'BattleSphere Campaign', 50);
  const formatLabel  = isLeague ? 'League' : 'Narrative';
  const setting      = campaign.setting || 'Gothic Sci-Fi';
  const topTerrs     = (territories || []).filter(t => !t.parent_id);
  const hasTerritories = topTerrs.length > 0;

  // ── Build the map SVG (only when territories exist) ──────────────────────
  let mapDataUri = null;
  if (hasTerritories) {
    const svgStr = buildMapSvg(
      territories || [],
      factions    || [],
      warpRoutes  || [],
      influenceData || [],
      setting,
      1200, 630
    );
    mapDataUri = `data:image/svg+xml;base64,${Buffer.from(svgStr).toString('base64')}`;
  }

  // Faction colour chips (up to 5)
  const factionChips = (factions || []).slice(0, 5);
  const nameSize = campaignName.length > 35 ? 40 : campaignName.length > 22 ? 50 : 60;

  // ── WITH MAP: full-bleed background + overlay ────────────────────────────
  if (mapDataUri) {
    return new ImageResponse(
      (
        <div style={{ width: 1200, height: 630, display: 'flex', position: 'relative', backgroundColor: BG_VOID, fontFamily: 'Cinzel', color: TEXT_PRI }}>

          {/* Map as full background */}
          <img
            src={mapDataUri}
            width={1200}
            height={630}
            style={{ position: 'absolute', top: 0, left: 0, width: 1200, height: 630 }}
          />

          {/* Top gradient overlay (for brand bar legibility) */}
          <div style={{
            position: 'absolute', top: 0, left: 0, width: 1200, height: 140, display: 'flex',
            backgroundImage: `linear-gradient(180deg, rgba(10,10,15,0.92) 0%, rgba(10,10,15,0.0) 100%)`,
          }} />

          {/* Bottom gradient overlay (for campaign name legibility) */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, width: 1200, height: 260, display: 'flex',
            backgroundImage: `linear-gradient(0deg, rgba(10,10,15,0.97) 0%, rgba(10,10,15,0.85) 50%, rgba(10,10,15,0.0) 100%)`,
          }} />

          {/* Top bar: brand + format + setting */}
          <div style={{
            position: 'absolute', top: 0, left: 0, width: 1200, display: 'flex',
            alignItems: 'center', justifyContent: 'space-between',
            padding: '26px 48px 0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: 11, height: 11, backgroundColor: GOLD, transform: 'rotate(45deg)', marginRight: 11 }} />
              <div style={{ fontSize: 15, letterSpacing: 8, textTransform: 'uppercase', color: GOLD, fontWeight: 700 }}>BattleSphere</div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{
                fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', color: GOLD,
                border: `1px solid ${GOLD}55`, padding: '3px 12px',
              }}>
                {formatLabel}
              </div>
              <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: TEXT_MUT }}>{setting}</div>
            </div>
          </div>

          {/* Bottom section: faction chips + campaign name + stats */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, width: 1200, display: 'flex',
            flexDirection: 'column', padding: '0 48px 28px',
          }}>
            {/* Faction colour chips */}
            {factionChips.length > 0 && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
                {factionChips.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 8, height: 8, backgroundColor: f.colour, transform: 'rotate(45deg)', flexShrink: 0 }} />
                    <div style={{ fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', color: TEXT_MUT }}>
                      {trunc(f.name, 18)}
                    </div>
                  </div>
                ))}
                {(factions || []).length > 5 && (
                  <div style={{ fontSize: 11, letterSpacing: 2, color: TEXT_MUT }}>+{(factions || []).length - 5} more</div>
                )}
              </div>
            )}

            {/* Campaign name */}
            <div style={{
              fontSize: nameSize, fontWeight: 900, letterSpacing: 3,
              textTransform: 'uppercase', color: TEXT_PRI, lineHeight: 1.0,
              marginBottom: 14,
            }}>
              {campaignName}
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div style={{ width: 5, height: 5, backgroundColor: GOLD, transform: 'rotate(45deg)', opacity: 0.7 }} />
                  <div style={{ fontSize: 12, letterSpacing: 4, color: TEXT_MUT, textTransform: 'uppercase' }}>
                    {memberCount ?? 0} {(memberCount ?? 0) === 1 ? 'Player' : 'Players'}
                  </div>
                </div>
                {!isLeague && (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <div style={{ width: 5, height: 5, backgroundColor: GOLD, transform: 'rotate(45deg)', opacity: 0.7 }} />
                    <div style={{ fontSize: 12, letterSpacing: 4, color: TEXT_MUT, textTransform: 'uppercase' }}>
                      {topTerrs.length} {topTerrs.length === 1 ? 'Territory' : 'Territories'}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div style={{ width: 5, height: 5, backgroundColor: GOLD, transform: 'rotate(45deg)', opacity: 0.7 }} />
                  <div style={{ fontSize: 12, letterSpacing: 4, color: TEXT_MUT, textTransform: 'uppercase' }}>
                    {battleCount ?? 0} {(battleCount ?? 0) === 1 ? 'Battle' : 'Battles'}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, letterSpacing: 3, color: GOLD, fontWeight: 700 }}>battlesphere.cc</div>
            </div>
          </div>
        </div>
      ),
      { ...size, ...fontOptions }
    );
  }

  // ── NO TERRITORIES: faction-colour text card ─────────────────────────────
  return new ImageResponse(
    (
      <div style={{
        width: 1200, height: 630, display: 'flex', flexDirection: 'column',
        backgroundColor: BG_VOID, fontFamily: 'Cinzel', color: TEXT_PRI,
        backgroundImage: `radial-gradient(ellipse 90% 50% at 50% 100%, rgba(183,140,64,0.10) 0%, transparent 60%)`,
      }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '28px 52px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: 12, height: 12, backgroundColor: GOLD, transform: 'rotate(45deg)', marginRight: 12 }} />
            <div style={{ fontSize: 16, letterSpacing: 8, textTransform: 'uppercase', color: GOLD, fontWeight: 700 }}>BattleSphere</div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', color: GOLD, border: `1px solid ${GOLD}55`, padding: '3px 12px' }}>{formatLabel}</div>
          </div>
        </div>

        {/* Centre: campaign name */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 80px' }}>
          <div style={{ fontSize: nameSize, fontWeight: 900, letterSpacing: 4, textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.05, marginBottom: 24 }}>
            {campaignName}
          </div>
          {/* Faction colour row */}
          {factionChips.length > 0 && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {factionChips.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, backgroundColor: f.colour, transform: 'rotate(45deg)' }} />
                  <div style={{ fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', color: TEXT_SEC }}>{trunc(f.name, 16)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 52px 28px', borderTop: `1px solid ${BORDER_DIM}` }}>
          <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ fontSize: 12, letterSpacing: 4, color: TEXT_MUT, textTransform: 'uppercase' }}>{memberCount ?? 0} Players</div>
            <div style={{ fontSize: 12, letterSpacing: 4, color: TEXT_MUT, textTransform: 'uppercase' }}>{battleCount ?? 0} Battles</div>
          </div>
          <div style={{ fontSize: 14, letterSpacing: 3, color: GOLD, fontWeight: 700 }}>battlesphere.cc</div>
        </div>
      </div>
    ),
    { ...size, ...fontOptions }
  );
}
