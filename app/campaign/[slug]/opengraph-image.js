import { ImageResponse } from 'next/og';
import { createAdminClient } from '@/lib/supabase/admin';
import fs from 'fs';
import path from 'path';

// Rendered at /campaign/[slug]/opengraph-image
// The campaign map is re-rendered as Satori-native JSX (div-based lines and
// diamonds) — Satori does not support SVG data URIs as <img> sources.

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

// ── Map maths (ported from CampaignMap.js) ───────────────────────────────────

function buildConnections(nodes) {
  const n = nodes.length;
  if (n < 2) return [];
  const edges = new Set();
  const add = (a, b) => { const key = [Math.min(a, b), Math.max(a, b)].join('-'); edges.add(key); };
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
        const dx = pts[j].x_pos - pts[i].x_pos, dy = pts[j].y_pos - pts[i].y_pos;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          const nx = dist > 0.0001 ? dx / dist : 1, ny = dist > 0.0001 ? dy / dist : 0;
          const push = (minDist - dist) / 2;
          pts[i].x_pos -= nx * push; pts[i].y_pos -= ny * push;
          pts[j].x_pos += nx * push; pts[j].y_pos += ny * push;
          maxMove = Math.max(maxMove, push);
        }
      }
    }
    for (const p of pts) { p.x_pos = Math.max(bx1, Math.min(bx2, p.x_pos)); p.y_pos = Math.max(by1, Math.min(by2, p.y_pos)); }
    if (maxMove < 0.01) break;
  }
  return pts;
}

function normalizePositions(territories) {
  const positioned = territories.filter(t => t.x_pos != null && t.y_pos != null);
  const X1 = 8, X2 = 92, Y1 = 8, Y2 = 83;
  const safeCx = (X1 + X2) / 2, safeCy = (Y1 + Y2) / 2;

  if (positioned.length === 0) {
    const n = territories.length || 1;
    return territories.map((t, i) => {
      const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
      return { ...t, x_pos: Math.round((safeCx + 28 * Math.cos(angle)) * 10) / 10, y_pos: Math.round((safeCy + 22 * Math.sin(angle)) * 10) / 10 };
    });
  }

  const xs = positioned.map(t => t.x_pos), ys = positioned.map(t => t.y_pos);
  const rawMinX = Math.min(...xs), rawMaxX = Math.max(...xs);
  const rawMinY = Math.min(...ys), rawMaxY = Math.max(...ys);
  const scale  = Math.min(1, (X2 - X1) / (rawMaxX - rawMinX || 1), (Y2 - Y1) / (rawMaxY - rawMinY || 1));
  const rawCx  = (rawMinX + rawMaxX) / 2, rawCy = (rawMinY + rawMaxY) / 2;
  const tx = x => Math.round((safeCx + (x - rawCx) * scale) * 10) / 10;
  const ty = y => Math.round((safeCy + (y - rawCy) * scale) * 10) / 10;

  let nullTopIdx = 0;
  let result = territories.map(t => {
    if (t.x_pos != null && t.y_pos != null) return { ...t, x_pos: tx(t.x_pos), y_pos: ty(t.y_pos) };
    if (!t.parent_id) { const off = (nullTopIdx++) * 0.15; return { ...t, x_pos: safeCx + off, y_pos: safeCy + off }; }
    return { ...t, x_pos: null, y_pos: null, _place: true };
  });

  result = result.map(t => {
    if (!t._place) return t;
    const parent = result.find(p => p.id === t.parent_id);
    const px = parent?.x_pos ?? safeCx, py = parent?.y_pos ?? safeCy;
    const nPlaced = result.filter(s => s.parent_id === t.parent_id && !s._place && s.id !== t.id).length;
    const angle = (nPlaced / Math.max(nPlaced + 1, 1)) * 2 * Math.PI - Math.PI / 2;
    const { _place, ...rest } = t;
    return { ...rest, x_pos: Math.round((px + 9 * Math.cos(angle)) * 10) / 10, y_pos: Math.round((py + 7 * Math.sin(angle)) * 10) / 10 };
  });

  const topBefore = result.filter(t => !t.parent_id);
  const topAfter  = separateNodes(topBefore, 12);
  const deltaById = {};
  topBefore.forEach((t, i) => { deltaById[t.id] = { dx: topAfter[i].x_pos - t.x_pos, dy: topAfter[i].y_pos - t.y_pos }; });
  result = result.map(t => {
    const d = t.parent_id ? deltaById[t.parent_id] : deltaById[t.id];
    return d ? { ...t, x_pos: t.x_pos + d.dx, y_pos: t.y_pos + d.dy } : t;
  });

  const parentIds = [...new Set(result.filter(t => t.parent_id).map(t => t.parent_id))];
  parentIds.forEach(pid => {
    const idxs = result.reduce((acc, t, i) => { if (t.parent_id === pid) acc.push(i); return acc; }, []);
    if (idxs.length < 2) return;
    const sep = separateNodes(idxs.map(i => result[i]), 5, 80, 2, 98, 2, 96);
    idxs.forEach((idx, i) => { result[idx] = { ...result[idx], x_pos: sep[i].x_pos, y_pos: sep[i].y_pos }; });
  });

  return result;
}

function dominantFactionId(territory, allTerritories, influenceData) {
  const agg = {};
  influenceData.filter(i => i.territory_id === territory.id).forEach(i => { agg[i.faction_id] = (agg[i.faction_id] || 0) + i.influence_points; });
  allTerritories.filter(t => t.parent_id === territory.id).forEach(sub => {
    influenceData.filter(i => i.territory_id === sub.id).forEach(i => { agg[i.faction_id] = (agg[i.faction_id] || 0) + i.influence_points * 0.5; });
  });
  const entries = Object.entries(agg).filter(([, v]) => v > 0);
  if (!entries.length) return territory.controlling_faction_id || null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

// ── Render the map as Satori-compatible JSX elements ─────────────────────────
// Satori does not support SVG data URIs — we use absolutely-positioned divs
// for lines (rotated thin strips) and diamonds (rotated squares).
function buildMapElements(territories, factions, warpRoutes, influenceData, W, H) {
  const normalized    = normalizePositions(territories);
  const topLevel      = normalized.filter(t => !t.parent_id);
  const subLevel      = normalized.filter(t =>  t.parent_id);
  const factionColour = Object.fromEntries((factions || []).map(f => [f.id, f.colour]));

  const connections = warpRoutes && warpRoutes.length > 0
    ? warpRoutes.map(r => [topLevel.find(t => t.id === r.territory_a), topLevel.find(t => t.id === r.territory_b)]).filter(([a, b]) => a && b)
    : buildConnections(topLevel).map(([a, b]) => [topLevel[a], topLevel[b]]);

  const sx = x => (x / 100) * W;
  const sy = y => (y / 100) * H;

  function lineEl(key, x1, y1, x2, y2, colour, thickness) {
    const dx  = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return null;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    return (
      <div key={key} style={{
        position: 'absolute', display: 'flex',
        left: x1, top: y1 - thickness / 2,
        width: len, height: thickness,
        backgroundColor: colour,
        transformOrigin: '0 50%',
        transform: `rotate(${angle}deg)`,
      }} />
    );
  }

  const els = [];

  // Sub-territory connector lines
  for (const t of subLevel) {
    const parent = normalized.find(p => p.id === t.parent_id);
    if (!parent || t.x_pos == null || parent.x_pos == null) continue;
    const el = lineEl(`sc-${t.id}`, sx(parent.x_pos), sy(parent.y_pos), sx(t.x_pos), sy(t.y_pos), 'rgba(255,255,255,0.07)', 1);
    if (el) els.push(el);
  }

  // Warp-route lines
  for (const [a, b] of connections) {
    if (a?.x_pos == null || b?.x_pos == null) continue;
    const el = lineEl(`wr-${a.id}-${b.id}`, sx(a.x_pos), sy(a.y_pos), sx(b.x_pos), sy(b.y_pos), 'rgba(255,255,255,0.22)', 2);
    if (el) els.push(el);
  }

  // Sub-territory nodes (circles)
  for (const t of subLevel) {
    if (t.x_pos == null) continue;
    const domId = dominantFactionId(t, normalized, influenceData);
    const col   = domId ? (factionColour[domId] || NEUTRAL_COL) : NEUTRAL_COL;
    const cx = sx(t.x_pos), cy = sy(t.y_pos), r = 6;
    els.push(
      <div key={`sn-${t.id}`} style={{
        position: 'absolute', display: 'flex',
        left: cx - r, top: cy - r, width: r * 2, height: r * 2,
        borderRadius: '50%', backgroundColor: col, opacity: 0.75,
        border: `1.5px solid ${col}`,
      }} />
    );
  }

  // Top-level nodes (diamonds) + labels
  for (const t of topLevel) {
    if (t.x_pos == null) continue;
    const domId = dominantFactionId(t, normalized, influenceData);
    const col   = domId ? (factionColour[domId] || NEUTRAL_COL) : NEUTRAL_COL;
    const cx = sx(t.x_pos), cy = sy(t.y_pos);
    const sz = 20; // half-size of the rotated square → diamond

    // Glow halo
    els.push(
      <div key={`gl-${t.id}`} style={{
        position: 'absolute', display: 'flex',
        left: cx - sz * 1.4, top: cy - sz * 1.4,
        width: sz * 2.8, height: sz * 2.8,
        backgroundColor: col, opacity: 0.07,
        transform: 'rotate(45deg)',
      }} />
    );
    // Diamond body
    els.push(
      <div key={`nd-${t.id}`} style={{
        position: 'absolute', display: 'flex',
        left: cx - sz, top: cy - sz,
        width: sz * 2, height: sz * 2,
        backgroundColor: col, opacity: 0.85,
        transform: 'rotate(45deg)',
        outline: `2px solid ${col}99`,
      }} />
    );
    // Name label
    const lw = 130;
    els.push(
      <div key={`lb-${t.id}`} style={{
        position: 'absolute', display: 'flex',
        left: cx - lw / 2, top: cy + sz + 10,
        width: lw, justifyContent: 'center',
        fontSize: 11, color: 'rgba(232,224,208,0.82)',
        fontFamily: 'Cinzel', textTransform: 'uppercase',
        letterSpacing: 1, lineHeight: 1,
      }}>
        {t.name}
      </div>
    );
  }

  return els;
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
      <div style={{ width: 1200, height: 630, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: BG_VOID, fontFamily: 'Cinzel' }}>
        <div style={{ fontSize: 32, letterSpacing: 8, textTransform: 'uppercase', color: GOLD }}>BattleSphere</div>
      </div>,
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

  const isLeague    = campaign.campaign_format === 'league';
  const campaignName = trunc(campaign.name || 'BattleSphere Campaign', 50);
  const formatLabel  = isLeague ? 'League' : 'Narrative';
  const setting      = campaign.setting || 'Gothic Sci-Fi';
  const topTerrs     = (territories || []).filter(t => !t.parent_id);
  const hasTerritories = topTerrs.length > 0;
  const factionChips   = (factions || []).slice(0, 5);
  const nameSize = campaignName.length > 35 ? 40 : campaignName.length > 22 ? 50 : 60;

  // Theme background colour
  const THEME_BG = {
    'Gothic Sci-Fi': '#060608',
    'Space Opera':   '#04050e',
    'High Fantasy':  '#060a06',
    'Historical':    '#080706',
  };
  const mapBg = THEME_BG[setting] || THEME_BG['Gothic Sci-Fi'];

  // ── WITH MAP ─────────────────────────────────────────────────────────────
  if (hasTerritories) {
    const mapEls = buildMapElements(
      territories || [], factions || [], warpRoutes || [], influenceData || [], 1200, 630
    );

    return new ImageResponse(
      (
        <div style={{ width: 1200, height: 630, display: 'flex', position: 'relative', backgroundColor: mapBg, fontFamily: 'Cinzel', color: TEXT_PRI, overflow: 'hidden' }}>

          {/* ── Map layer ── */}
          {/* Grid: CSS repeating gradients */}
          <div style={{
            position: 'absolute', display: 'flex', top: 0, left: 0, width: 1200, height: 630,
            backgroundImage: `linear-gradient(rgba(183,140,64,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(183,140,64,0.05) 1px, transparent 1px)`,
            backgroundSize: '50px 33px',
          }} />
          {/* Territory nodes, routes, labels */}
          {mapEls}

          {/* ── Top gradient ── */}
          <div style={{
            position: 'absolute', display: 'flex', top: 0, left: 0, width: 1200, height: 130,
            backgroundImage: `linear-gradient(180deg, rgba(6,6,8,0.95) 0%, transparent 100%)`,
          }} />

          {/* ── Bottom gradient ── */}
          <div style={{
            position: 'absolute', display: 'flex', bottom: 0, left: 0, width: 1200, height: 240,
            backgroundImage: `linear-gradient(0deg, rgba(6,6,8,0.97) 0%, rgba(6,6,8,0.82) 55%, transparent 100%)`,
          }} />

          {/* ── Top bar: brand + format ── */}
          <div style={{
            position: 'absolute', display: 'flex', top: 0, left: 0, width: 1200,
            alignItems: 'center', justifyContent: 'space-between', padding: '26px 48px 0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: 11, height: 11, backgroundColor: GOLD, transform: 'rotate(45deg)', marginRight: 11 }} />
              <div style={{ fontSize: 15, letterSpacing: 8, textTransform: 'uppercase', color: GOLD, fontWeight: 700 }}>BattleSphere</div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', color: GOLD, border: `1px solid ${GOLD}55`, padding: '3px 12px' }}>
                {formatLabel}
              </div>
              <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: TEXT_MUT }}>{setting}</div>
            </div>
          </div>

          {/* ── Bottom: factions + campaign name + stats ── */}
          <div style={{
            position: 'absolute', display: 'flex', bottom: 0, left: 0, width: 1200,
            flexDirection: 'column', padding: '0 48px 26px',
          }}>
            {/* Faction chips */}
            {factionChips.length > 0 && (
              <div style={{ display: 'flex', gap: 14, marginBottom: 12, alignItems: 'center' }}>
                {factionChips.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 8, height: 8, backgroundColor: f.colour, transform: 'rotate(45deg)', flexShrink: 0 }} />
                    <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: TEXT_MUT }}>{trunc(f.name, 18)}</div>
                  </div>
                ))}
                {(factions || []).length > 5 && (
                  <div style={{ fontSize: 11, color: TEXT_MUT }}>+{(factions || []).length - 5} more</div>
                )}
              </div>
            )}
            {/* Campaign name */}
            <div style={{ fontSize: nameSize, fontWeight: 900, letterSpacing: 3, textTransform: 'uppercase', color: TEXT_PRI, lineHeight: 1.0, marginBottom: 14 }}>
              {campaignName}
            </div>
            {/* Stats row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                {[
                  `${memberCount ?? 0} ${(memberCount ?? 0) === 1 ? 'Player' : 'Players'}`,
                  ...(!isLeague ? [`${topTerrs.length} ${topTerrs.length === 1 ? 'Territory' : 'Territories'}`] : []),
                  `${battleCount ?? 0} ${(battleCount ?? 0) === 1 ? 'Battle' : 'Battles'}`,
                ].map((label, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <div style={{ width: 5, height: 5, backgroundColor: GOLD, transform: 'rotate(45deg)', opacity: 0.6 }} />
                    <div style={{ fontSize: 12, letterSpacing: 4, color: TEXT_MUT, textTransform: 'uppercase' }}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 13, letterSpacing: 3, color: GOLD, fontWeight: 700 }}>battlesphere.cc</div>
            </div>
          </div>
        </div>
      ),
      { ...size, ...fontOptions }
    );
  }

  // ── NO TERRITORIES: faction-colour text card ──────────────────────────────
  return new ImageResponse(
    (
      <div style={{
        width: 1200, height: 630, display: 'flex', flexDirection: 'column',
        backgroundColor: BG_VOID, fontFamily: 'Cinzel', color: TEXT_PRI,
        backgroundImage: `radial-gradient(ellipse 90% 50% at 50% 100%, rgba(183,140,64,0.10) 0%, transparent 60%)`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '28px 52px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: 12, height: 12, backgroundColor: GOLD, transform: 'rotate(45deg)', marginRight: 12 }} />
            <div style={{ fontSize: 16, letterSpacing: 8, textTransform: 'uppercase', color: GOLD, fontWeight: 700 }}>BattleSphere</div>
          </div>
          <div style={{ fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', color: GOLD, border: `1px solid ${GOLD}55`, padding: '3px 12px' }}>{formatLabel}</div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 80px' }}>
          <div style={{ fontSize: nameSize, fontWeight: 900, letterSpacing: 4, textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.05, marginBottom: 24 }}>
            {campaignName}
          </div>
          {factionChips.length > 0 && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {factionChips.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, backgroundColor: f.colour, transform: 'rotate(45deg)' }} />
                  <div style={{ fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', color: TEXT_SEC }}>{trunc(f.name, 16)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 52px 28px', borderTop: `1px solid ${BORDER_DIM}` }}>
          <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ fontSize: 12, letterSpacing: 4, color: TEXT_MUT, textTransform: 'uppercase' }}>{`${memberCount ?? 0} Players`}</div>
            <div style={{ fontSize: 12, letterSpacing: 4, color: TEXT_MUT, textTransform: 'uppercase' }}>{`${battleCount ?? 0} Battles`}</div>
          </div>
          <div style={{ fontSize: 14, letterSpacing: 3, color: GOLD, fontWeight: 700 }}>battlesphere.cc</div>
        </div>
      </div>
    ),
    { ...size, ...fontOptions }
  );
}
