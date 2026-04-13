'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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

function DiamondIcon({ cx, cy, size, fill }) {
  const h = size * 0.6;
  const w = size * 0.45;
  const points = `${cx},${cy - h} ${cx + w},${cy} ${cx},${cy + h} ${cx - w},${cy}`;
  return <polygon points={points} fill={fill} strokeWidth="0" />;
}

const SETTING_BG = {
  'Gothic Sci-Fi': { bg: '#060608', grid: 'rgba(183,140,64,0.04)' },
  'Space Opera':   { bg: '#04050e', grid: 'rgba(100,140,220,0.04)' },
  'High Fantasy':  { bg: '#060a06', grid: 'rgba(80,160,80,0.04)'  },
  'Historical':    { bg: '#080706', grid: 'rgba(180,140,80,0.04)' },
  'Custom':        { bg: '#060608', grid: 'rgba(183,140,64,0.04)' },
};

const GOLD_HEX         = '#b78c40';
const GOLD_NEUTRAL_HEX = '#d4a830';

// ── Force-separation: push nodes apart until no two are closer than minDist ──
function separateNodes(nodes, minDist, iterations = 150, bx1 = 12, bx2 = 88, by1 = 12, by2 = 78) {
  if (nodes.length < 2) return nodes;
  const pts = nodes.map((n, i) => ({
    ...n,
    x_pos: n.x_pos + i * 0.05,
    y_pos: n.y_pos + i * 0.03,
  }));
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

// ── Auto-fit + collision avoidance ────────────────────────────────────────────
function normalizePositions(territories) {
  const positioned = territories.filter(t => t.x_pos != null && t.y_pos != null);

  const X1 = 8,  X2 = 92;
  const Y1 = 8,  Y2 = 83;
  const safeCx = (X1 + X2) / 2;
  const safeCy = (Y1 + Y2) / 2;

  if (positioned.length === 0) {
    const n = territories.length || 1;
    return territories.map((t, i) => {
      const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
      return { ...t,
        x_pos: Math.round((safeCx + 28 * Math.cos(angle)) * 10) / 10,
        y_pos: Math.round((safeCy + 22 * Math.sin(angle)) * 10) / 10,
      };
    });
  }

  const xs     = positioned.map(t => t.x_pos);
  const ys     = positioned.map(t => t.y_pos);
  const rawMinX = Math.min(...xs), rawMaxX = Math.max(...xs);
  const rawMinY = Math.min(...ys), rawMaxY = Math.max(...ys);
  const dataW  = rawMaxX - rawMinX || 1;
  const dataH  = rawMaxY - rawMinY || 1;
  const scale  = Math.min(1, (X2 - X1) / dataW, (Y2 - Y1) / dataH);
  const rawCx  = (rawMinX + rawMaxX) / 2;
  const rawCy  = (rawMinY + rawMaxY) / 2;

  const tx = x => Math.round((safeCx + (x - rawCx) * scale) * 10) / 10;
  const ty = y => Math.round((safeCy + (y - rawCy) * scale) * 10) / 10;

  let nullTopIdx = 0;
  let result = territories.map(t => {
    if (t.x_pos != null && t.y_pos != null) {
      return { ...t, x_pos: tx(t.x_pos), y_pos: ty(t.y_pos) };
    }
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
    return { ...rest,
      x_pos: Math.round((px + 9 * Math.cos(angle)) * 10) / 10,
      y_pos: Math.round((py + 7 * Math.sin(angle)) * 10) / 10,
    };
  });

  const topBefore = result.filter(t => !t.parent_id);
  const topAfter  = separateNodes(topBefore, 12);

  const deltaById = {};
  topBefore.forEach((t, i) => {
    deltaById[t.id] = {
      dx: topAfter[i].x_pos - t.x_pos,
      dy: topAfter[i].y_pos - t.y_pos,
    };
  });

  result = result.map(t => {
    if (!t.parent_id) {
      const d = deltaById[t.id];
      return { ...t, x_pos: t.x_pos + d.dx, y_pos: t.y_pos + d.dy };
    }
    const d = deltaById[t.parent_id];
    if (d) return { ...t, x_pos: t.x_pos + d.dx, y_pos: t.y_pos + d.dy };
    return t;
  });

  const parentIds = [...new Set(result.filter(t => t.parent_id).map(t => t.parent_id))];
  parentIds.forEach(pid => {
    const idxs = result.reduce((acc, t, i) => { if (t.parent_id === pid) acc.push(i); return acc; }, []);
    if (idxs.length < 2) return;
    // Wide bounds (2–98 × 2–96): sub-territories near a canvas edge must not
    // be clamped into their parent. Slight overshoot is fine visually.
    const separated = separateNodes(idxs.map(i => result[i]), 5, 80, 2, 98, 2, 96);
    idxs.forEach((idx, i) => { result[idx] = { ...result[idx], x_pos: separated[i].x_pos, y_pos: separated[i].y_pos }; });
  });

  return result;
}

// ── Label offset ──────────────────────────────────────────────────────────────
function getLabelOffset(t, allTerritories) {
  const subs = allTerritories.filter(
    s => s.parent_id === t.id && s.x_pos != null && s.y_pos != null
  );
  if (subs.length === 0) return { dx: 0, dy: 5 };

  let sx = 0, sy = 0;
  subs.forEach(s => {
    const dx  = s.x_pos - t.x_pos;
    const dy  = s.y_pos - t.y_pos;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.5) return;
    sx += dx / len;
    sy += dy / len;
  });
  const len = Math.sqrt(sx * sx + sy * sy);
  if (len < 0.01) return { dx: 0, dy: 5 };

  return { dx: -(sx / len) * 5, dy: -(sy / len) * 5 };
}

// readOnly={true} disables node click navigation (used on the public campaign page)
// warpRoutes: array of { territory_a: uuid, territory_b: uuid } from the DB.
//   If empty/absent, falls back to the auto-generated ring topology (legacy campaigns).
export default function CampaignMap({ territories, factions, influenceData = [], campaignSlug, setting, readOnly = false, warpRoutes = [] }) {
  const router = useRouter();
  const [hoveredId, setHoveredId] = useState(null);
  const [tooltip, setTooltip]     = useState(null);

  const normalizedTerritories = normalizePositions(territories);

  const topLevel = normalizedTerritories.filter(t => t.depth === 1);
  const subLevel = normalizedTerritories.filter(t => t.depth === 2);

  // Build connection pairs as [territoryA, territoryB] using DB routes if available,
  // otherwise fall back to the auto-generated ring topology (for legacy campaigns).
  const connections = warpRoutes && warpRoutes.length > 0
    ? warpRoutes
        .map(r => [
          topLevel.find(t => t.id === r.territory_a),
          topLevel.find(t => t.id === r.territory_b),
        ])
        .filter(([a, b]) => a && b)
    : buildConnections(topLevel).map(([a, b]) => [topLevel[a], topLevel[b]]);

  const theme     = SETTING_BG[setting] || SETTING_BG['Custom'];
  const isFantasy = setting === 'High Fantasy';

  // Fantasy palette overrides
  const FANTASY_NEUTRAL_HEX = '#8ab4d0';

  const factionColour = Object.fromEntries((factions || []).map(f => [f.id, f.colour]));

  function aggregatedInfluenceMap(territory) {
    const result = {};
    influenceData
      .filter(i => i.territory_id === territory.id)
      .forEach(i => {
        result[i.faction_id] = (result[i.faction_id] || 0) + i.influence_points;
      });
    if (territory.depth === 1) {
      const subs = normalizedTerritories.filter(t => t.parent_id === territory.id);
      subs.forEach(sub => {
        influenceData
          .filter(i => i.territory_id === sub.id)
          .forEach(i => {
            result[i.faction_id] = (result[i.faction_id] || 0) + i.influence_points * 0.5;
          });
      });
    }
    return result;
  }

  function dominantFactionId(territory) {
    const aggMap  = aggregatedInfluenceMap(territory);
    const entries = Object.entries(aggMap).filter(([, pts]) => pts > 0);
    if (entries.length > 0) {
      entries.sort((a, b) => b[1] - a[1]);
      return entries[0][0];
    }
    return territory.controlling_faction_id || null;
  }

  function influenceRows(territory) {
    const aggMap = aggregatedInfluenceMap(territory);
    return Object.entries(aggMap)
      .filter(([, pts]) => pts > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([faction_id, influence_points]) => ({ faction_id, influence_points }));
  }

  function handleNodeClick(t) {
    if (readOnly) return;
    router.push(`/c/${campaignSlug}/territory/${t.id}`);
  }

  function handleMouseMove(e, t) {
    const rect = e.currentTarget.closest('svg').getBoundingClientRect();
    setTooltip({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top)  / rect.height) * 100,
      territory: t,
    });
  }

  function renderTooltip() {
    if (!tooltip) return null;
    const t        = tooltip.territory;
    const domId    = dominantFactionId(t);
    const domName  = domId ? factions?.find(f => f.id === domId)?.name : null;
    const rows     = influenceRows(t);

    const hasSubs  = t.depth === 1 && normalizedTerritories.some(s => s.parent_id === t.id);
    const hasSubInfluence = hasSubs && influenceData.some(i =>
      normalizedTerritories.filter(s => s.parent_id === t.id).map(s => s.id).includes(i.territory_id) && i.influence_points > 0
    );

    const hasImage = !!t.image_url;
    const IMG_H    = hasImage ? 13 : 0;   // height reserved for the thumbnail

    const TW      = 36;
    const ROW_H   = 2.5;
    const FOOT_H  = hasSubInfluence ? 2.2 : 0;
    const TH      = IMG_H + 8.5 + Math.max(1, rows.length) * ROW_H + FOOT_H;

    const TX = Math.min(tooltip.x + 2, 100 - TW - 1);
    const TY = Math.max(1, tooltip.y - TH - 2);

    // Text positions are offset downward by the image area
    const textBaseY  = TY + IMG_H;
    const nameY      = textBaseY + 3.0;
    const typeY      = textBaseY + 5.0;
    const divY       = textBaseY + 6.2;
    const firstRowY  = textBaseY + 8.0;

    return (
      <g style={{ pointerEvents: 'none' }}>

        {/* ── Dark background (full tooltip area) ── */}
        <rect
          x={`${TX}%`} y={`${TY}%`}
          width={`${TW}%`} height={`${TH}%`}
          fill="rgba(8,8,12,0.97)"
          rx="0.4"
        />

        {/* ── Thumbnail image ── */}
        {hasImage && (
          <>
            <image
              href={t.image_url}
              x={`${TX}%`} y={`${TY}%`}
              width={`${TW}%`} height={`${IMG_H}%`}
              preserveAspectRatio="xMidYMid slice"
            />
            {/* Fade gradient: bottom 30% of image fades to the dark panel below */}
            <rect
              x={`${TX}%`} y={`${TY + IMG_H * 0.7}%`}
              width={`${TW}%`} height={`${IMG_H * 0.3}%`}
              fill="url(#tooltipImgFade)"
            />
          </>
        )}

        {/* ── Gold border drawn on top of image ── */}
        <rect
          x={`${TX}%`} y={`${TY}%`}
          width={`${TW}%`} height={`${TH}%`}
          fill="none"
          stroke="rgba(183,140,64,0.35)"
          strokeWidth="0.25"
          rx="0.4"
        />

        {/* ── Territory name ── */}
        <text
          x={`${TX + 2}%`} y={`${nameY}%`}
          fill="rgba(183,140,64,0.95)"
          fontSize="1.9"
          fontFamily="var(--font-display, sans-serif)"
          letterSpacing="0.1em"
          style={{ userSelect: 'none', textTransform: 'uppercase' }}
        >
          {t.name.length > 22 ? t.name.slice(0, 20) + '…' : t.name}
        </text>

        {/* ── Type · Controlling faction ── */}
        <text
          x={`${TX + 2}%`} y={`${typeY}%`}
          fill="rgba(200,180,140,0.45)"
          fontSize="1.5"
          fontFamily="serif"
          fontStyle="italic"
          style={{ userSelect: 'none' }}
        >
          {[t.type, domName].filter(Boolean).join(' · ') || 'No control'}
        </text>

        {/* ── Divider ── */}
        <line
          x1={`${TX + 1.5}%`} y1={`${divY}%`}
          x2={`${TX + TW - 1.5}%`} y2={`${divY}%`}
          stroke="rgba(183,140,64,0.12)" strokeWidth="0.2"
        />

        {/* ── Influence rows ── */}
        {rows.length > 0 ? rows.map((row, i) => {
          const faction = factions?.find(f => f.id === row.faction_id);
          if (!faction) return null;
          const ry = firstRowY + i * ROW_H;
          return (
            <g key={row.faction_id}>
              <DiamondIcon cx={TX + 3.2} cy={ry - 0.5} size={0.9} fill={faction.colour} />
              <text
                x={`${TX + 5}%`} y={`${ry}%`}
                fill="rgba(220,200,160,0.8)"
                fontSize="1.55"
                fontFamily="var(--font-display, sans-serif)"
                style={{ userSelect: 'none' }}
              >
                {faction.name.length > 14 ? faction.name.slice(0, 12) + '…' : faction.name}
              </text>
              <text
                x={`${TX + TW - 2.5}%`} y={`${ry}%`}
                textAnchor="end"
                fill={faction.colour}
                fontSize="1.6"
                fontFamily="monospace"
                style={{ userSelect: 'none' }}
              >
                {row.influence_points}
              </text>
            </g>
          );
        }) : (
          <text
            x={`${TX + 2}%`} y={`${firstRowY}%`}
            fill="rgba(200,180,140,0.3)"
            fontSize="1.45"
            fontFamily="serif"
            fontStyle="italic"
            style={{ userSelect: 'none' }}
          >
            No battles fought here yet
          </text>
        )}

        {/* ── Sub-territory footnote ── */}
        {hasSubInfluence && (
          <text
            x={`${TX + TW / 2}%`} y={`${TY + TH - 1.2}%`}
            textAnchor="middle"
            fill="rgba(183,140,64,0.25)"
            fontSize="1.3"
            fontFamily="serif"
            fontStyle="italic"
            style={{ userSelect: 'none' }}
          >
            incl. sub-territories ×0.5
          </text>
        )}
      </g>
    );
  }

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      style={{ background: theme.bg, display: 'block', cursor: 'default', touchAction: 'manipulation' }}
      onMouseLeave={() => { setHoveredId(null); setTooltip(null); }}
    >
      {/* ── Gradient + filter definitions ────────────────────────────────── */}
      <defs>
        <linearGradient id="tooltipImgFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(8,8,12,0)" />
          <stop offset="100%" stopColor="rgba(8,8,12,0.97)" />
        </linearGradient>
        {/* Fantasy glow filter — applied to node circles */}
        <filter id="fantasy-node-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur"/>
          <feFlood floodColor="rgba(140,190,255,0.9)" result="color"/>
          <feComposite in="color" in2="blur" operator="in" result="shadow"/>
          <feMerge>
            <feMergeNode in="shadow"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        {/* Fantasy glow filter — applied to warp route lines */}
        <filter id="fantasy-route-glow" x="-300%" y="-300%" width="700%" height="700%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="0.7" result="blur"/>
          <feFlood floodColor="rgba(180,215,255,0.85)" result="color"/>
          <feComposite in="color" in2="blur" operator="in" result="shadow"/>
          <feMerge>
            <feMergeNode in="shadow"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* ── Background image ──────────────────────────────────────────────── */}
      <image
        href={isFantasy ? '/map-background-fantasy.png' : '/map-background.jpg'}
        x="0" y="0"
        width="100%" height="100%"
        preserveAspectRatio="xMidYMid slice"
      />
      {/* Fantasy uses a lighter overlay so the vibrant background shows through */}
      <rect x="0" y="0" width="100%" height="100%" fill={isFantasy ? 'rgba(5,5,10,0.38)' : 'rgba(5,5,10,0.58)'} />

      {/* ── Warp route connections ────────────────────────────────────────── */}
      {connections.map(([ta, tb], i) => {
        if (!ta || !tb) return null;
        const isHovered = hoveredId === ta.id || hoveredId === tb.id;
        if (isFantasy) {
          return (
            <line
              key={i}
              x1={`${ta.x_pos}%`} y1={`${ta.y_pos}%`}
              x2={`${tb.x_pos}%`} y2={`${tb.y_pos}%`}
              stroke={isHovered ? 'rgba(210,230,255,0.85)' : 'rgba(180,210,255,0.28)'}
              strokeWidth={isHovered ? '0.5' : '0.3'}
              filter="url(#fantasy-route-glow)"
              style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
            />
          );
        }
        return (
          <line
            key={i}
            x1={`${ta.x_pos}%`} y1={`${ta.y_pos}%`}
            x2={`${tb.x_pos}%`} y2={`${tb.y_pos}%`}
            stroke={isHovered ? `${GOLD_HEX}80` : `${GOLD_HEX}28`}
            strokeWidth={isHovered ? '0.4' : '0.25'}
            strokeDasharray="1.2 0.8"
            style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
          />
        );
      })}

      {/* ── Sub-territory connector lines ─────────────────────────────────── */}
      {subLevel.map(sub => {
        const parent = topLevel.find(t => t.id === sub.parent_id);
        if (!parent) return null;

        const parentDomId = dominantFactionId(parent);
        const subDomId    = dominantFactionId(sub);
        const sameOwner   = parentDomId && subDomId && parentDomId === subDomId;
        const lineColour  = sameOwner
          ? (factionColour[parentDomId] || GOLD_NEUTRAL_HEX)
          : GOLD_NEUTRAL_HEX;

        return (
          <line
            key={sub.id}
            x1={`${parent.x_pos}%`} y1={`${parent.y_pos}%`}
            x2={`${sub.x_pos}%`}   y2={`${sub.y_pos}%`}
            stroke={lineColour}
            strokeWidth={sameOwner ? '0.3' : '0.2'}
            opacity={sameOwner ? 0.55 : 0.38}
          />
        );
      })}

      {/* ── Sub-territory nodes ───────────────────────────────────────────── */}
      {subLevel.map(sub => {
        const isHov    = hoveredId === sub.id;
        const domId    = dominantFactionId(sub);
        const subColour = domId
          ? (factionColour[domId] || GOLD_HEX)
          : GOLD_NEUTRAL_HEX;

        return (
          <g
            key={sub.id}
            style={{ cursor: readOnly ? 'default' : 'pointer' }}
            onClick={() => handleNodeClick(sub)}
            onMouseEnter={() => setHoveredId(sub.id)}
            onMouseLeave={() => { setHoveredId(null); setTooltip(null); }}
            onMouseMove={e => handleMouseMove(e, sub)}
          >
            {/* Invisible larger touch target for mobile */}
            <circle
              cx={`${sub.x_pos}%`} cy={`${sub.y_pos}%`} r="3%"
              fill="transparent" stroke="none"
            />
            {isHov && (
              <circle
                cx={`${sub.x_pos}%`} cy={`${sub.y_pos}%`} r="2.2%"
                fill={`${subColour}18`} stroke={`${subColour}50`} strokeWidth="0.25"
              />
            )}
            <circle
              cx={`${sub.x_pos}%`} cy={`${sub.y_pos}%`} r="1.2%"
              fill={isHov ? `${subColour}45` : `${subColour}28`}
              stroke={isHov ? subColour : `${subColour}bb`}
              strokeWidth={isHov ? '0.4' : '0.3'}
              style={{ transition: 'stroke 0.15s' }}
            />
            {isHov && (
              <text
                x={`${sub.x_pos}%`}
                y={`${sub.y_pos + 2.2}%`}
                textAnchor="middle"
                fill={isFantasy ? 'rgba(200,225,255,0.9)' : 'rgba(220,200,160,0.75)'}
                fontSize="1.6"
                fontFamily="var(--font-display, sans-serif)"
                letterSpacing="0.06em"
                stroke={isFantasy ? 'rgba(0,0,0,0.85)' : 'none'}
                strokeWidth={isFantasy ? '0.4' : '0'}
                paintOrder="stroke"
                style={{ userSelect: 'none', textTransform: 'uppercase' }}
              >
                {sub.name.length > 14 ? sub.name.slice(0, 12) + '…' : sub.name}
              </text>
            )}
          </g>
        );
      })}

      {/* ── Top-level territory nodes ─────────────────────────────────────── */}
      {topLevel.map(t => {
        const isHov = hoveredId === t.id;
        const cx    = `${t.x_pos}%`;
        const cy    = `${t.y_pos}%`;
        const cxN   = t.x_pos;
        const cyN   = t.y_pos;
        const { dx: ldx, dy: ldy } = getLabelOffset(t, normalizedTerritories);

        const domId = dominantFactionId(t);
        const neutralHex = isFantasy ? FANTASY_NEUTRAL_HEX : GOLD_NEUTRAL_HEX;
        const baseColour = domId
          ? (factionColour[domId] || (isFantasy ? FANTASY_NEUTRAL_HEX : GOLD_HEX))
          : neutralHex;

        const dimColour  = domId ? `${baseColour}88` : `${neutralHex}cc`;
        const ringColour = isHov ? baseColour : domId ? `${baseColour}88` : `${neutralHex}cc`;

        return (
          <g
            key={t.id}
            style={{ cursor: readOnly ? 'default' : 'pointer' }}
            onClick={() => handleNodeClick(t)}
            onMouseEnter={() => setHoveredId(t.id)}
            onMouseLeave={() => { setHoveredId(null); setTooltip(null); }}
            onMouseMove={e => handleMouseMove(e, t)}
          >
            {/* Invisible larger touch target for mobile */}
            <circle cx={cx} cy={cy} r="5.5%" fill="transparent" stroke="none" />
            {/* Fantasy glow halo — rendered behind everything else */}
            {isFantasy && (
              <circle cx={cx} cy={cy} r="3.6%"
                fill={isHov ? `${baseColour}60` : `${baseColour}35`}
                stroke="none"
                filter="url(#fantasy-node-glow)"
                style={{ transition: 'fill 0.2s' }}
              />
            )}
            {isHov && (
              <circle cx={cx} cy={cy} r="4.5%"
                fill={`${baseColour}18`} stroke={`${baseColour}40`} strokeWidth="0.3"
              />
            )}
            {domId && !isHov && (
              <circle cx={cx} cy={cy} r="3.6%"
                fill="none" stroke={`${baseColour}50`} strokeWidth="0.5"
              />
            )}
            <circle cx={cx} cy={cy} r="3.2%"
              fill="rgba(10,10,15,0.88)"
              stroke={ringColour}
              strokeWidth={isHov ? '0.5' : '0.38'}
              style={{ transition: 'stroke 0.15s, stroke-width 0.15s' }}
            />
            <circle cx={cx} cy={cy} r="2.2%"
              fill={isHov
                ? `${baseColour}30`
                : domId ? `${baseColour}14` : `${GOLD_NEUTRAL_HEX}18`}
              style={{ transition: 'fill 0.15s' }}
            />
            <DiamondIcon
              cx={cxN} cy={cyN} size={1.4}
              fill={isHov ? baseColour : domId ? dimColour : GOLD_NEUTRAL_HEX}
            />
            <text
              x={`${cxN + ldx}%`} y={`${cyN + ldy}%`}
              textAnchor="middle"
              fill={isHov ? (isFantasy ? '#ddeeff' : '#e8d5a0') : (isFantasy ? 'rgba(200,225,255,0.85)' : 'rgba(220,200,160,0.7)')}
              fontSize="2"
              fontFamily="var(--font-display, sans-serif)"
              letterSpacing="0.08em"
              stroke={isFantasy ? 'rgba(0,0,0,0.9)' : 'none'}
              strokeWidth={isFantasy ? '0.45' : '0'}
              paintOrder="stroke"
              style={{ transition: 'fill 0.15s', userSelect: 'none', textTransform: 'uppercase' }}
            >
              {t.name.length > 16 ? t.name.slice(0, 14) + '…' : t.name}
            </text>
          </g>
        );
      })}

      {/* ── Tooltip (on top) ─────────────────────────────────────────────── */}
      {renderTooltip()}
    </svg>
  );
}
