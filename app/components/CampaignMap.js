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

// Gold for faction-controlled territories (hex for safe alpha interpolation)
const GOLD_HEX         = '#b78c40';
// Brighter, more vibrant gold for neutral / uncontrolled territories
const GOLD_NEUTRAL_HEX = '#d4a830';

export default function CampaignMap({ territories, factions, influenceData = [], campaignSlug, setting }) {
  const router = useRouter();
  const [hoveredId, setHoveredId] = useState(null);
  const [tooltip, setTooltip]     = useState(null); // { x, y, territory }

  const topLevel    = territories.filter(t => t.depth === 1);
  const subLevel    = territories.filter(t => t.depth === 2);
  const connections = buildConnections(topLevel);

  const theme = SETTING_BG[setting] || SETTING_BG['Custom'];

  const factionColour = Object.fromEntries((factions || []).map(f => [f.id, f.colour]));

  // Build a map of { faction_id → aggregated influence } for a territory.
  // For top-level territories (depth 1), sub-territory influence counts at 0.5x.
  function aggregatedInfluenceMap(territory) {
    const result = {};

    // Direct influence on this territory
    influenceData
      .filter(i => i.territory_id === territory.id)
      .forEach(i => {
        result[i.faction_id] = (result[i.faction_id] || 0) + i.influence_points;
      });

    // Sub-territory contributions at 0.5× (top-level only)
    if (territory.depth === 1) {
      const subs = territories.filter(t => t.parent_id === territory.id);
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

  // Return the faction id with the highest aggregated influence,
  // falling back to controlling_faction_id, then null.
  function dominantFactionId(territory) {
    const aggMap  = aggregatedInfluenceMap(territory);
    const entries = Object.entries(aggMap).filter(([, pts]) => pts > 0);
    if (entries.length > 0) {
      entries.sort((a, b) => b[1] - a[1]);
      return entries[0][0];
    }
    return territory.controlling_faction_id || null;
  }

  // Sorted influence rows for tooltip display (aggregated, factions with > 0 only)
  function influenceRows(territory) {
    const aggMap = aggregatedInfluenceMap(territory);
    return Object.entries(aggMap)
      .filter(([, pts]) => pts > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([faction_id, influence_points]) => ({ faction_id, influence_points }));
  }

  function handleNodeClick(t) {
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

  // ── Tooltip renderer ─────────────────────────────────────────────────────────
  function renderTooltip() {
    if (!tooltip) return null;
    const t        = tooltip.territory;
    const domId    = dominantFactionId(t);
    const domName  = domId ? factions?.find(f => f.id === domId)?.name : null;
    const rows     = influenceRows(t);

    // Does this territory have sub-territory contributions?
    const hasSubs  = t.depth === 1 && territories.some(s => s.parent_id === t.id);
    const hasSubInfluence = hasSubs && influenceData.some(i =>
      territories.filter(s => s.parent_id === t.id).map(s => s.id).includes(i.territory_id) && i.influence_points > 0
    );

    // Tooltip dimensions (SVG viewBox units, not px)
    const TW      = 36;
    const ROW_H   = 2.5;
    const FOOT_H  = hasSubInfluence ? 2.2 : 0;
    const TH      = 8.5 + Math.max(1, rows.length) * ROW_H + FOOT_H;

    // Position: prefer right of cursor, clamp to viewport; appear above cursor
    const TX = Math.min(tooltip.x + 2, 100 - TW - 1);
    const TY = Math.max(1, tooltip.y - TH - 2);

    // Y positions for each text element inside the box
    const nameY      = TY + 3.0;
    const typeY      = TY + 5.0;
    const divY       = TY + 6.2;
    const firstRowY  = TY + 8.0;

    return (
      <g style={{ pointerEvents: 'none' }}>
        {/* Background box */}
        <rect
          x={`${TX}%`} y={`${TY}%`}
          width={`${TW}%`} height={`${TH}%`}
          fill="rgba(8,8,12,0.97)"
          stroke="rgba(183,140,64,0.35)"
          strokeWidth="0.25"
          rx="0.4"
        />

        {/* Territory name */}
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

        {/* Type + dominant faction */}
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

        {/* Divider */}
        <line
          x1={`${TX + 1.5}%`} y1={`${divY}%`}
          x2={`${TX + TW - 1.5}%`} y2={`${divY}%`}
          stroke="rgba(183,140,64,0.12)" strokeWidth="0.2"
        />

        {/* Influence rows */}
        {rows.length > 0 ? rows.map((row, i) => {
          const faction = factions?.find(f => f.id === row.faction_id);
          if (!faction) return null;
          const ry = firstRowY + i * ROW_H;
          return (
            <g key={row.faction_id}>
              <DiamondIcon
                cx={TX + 3.2} cy={ry - 0.5} size={0.9}
                fill={faction.colour}
              />
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
        {/* Sub-territory footnote */}
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
      style={{ background: theme.bg, display: 'block', cursor: 'default' }}
      onMouseLeave={() => { setHoveredId(null); setTooltip(null); }}
    >
      {/* ── Background image ─────────────────────────────────────────────────── */}
      {/* Place map-background.jpg in your /public folder to activate this */}
      <image
        href="/map-background.jpg"
        x="0" y="0"
        width="100%" height="100%"
        preserveAspectRatio="xMidYMid slice"
      />
      {/* Dark overlay — ensures territory nodes remain readable over the photo */}
      <rect x="0" y="0" width="100%" height="100%" fill="rgba(5,5,10,0.58)" />


      {/* ── Warp route connections (top-level ↔ top-level) ───────────────────── */}
      {connections.map(([a, b], i) => {
        const ta = topLevel[a];
        const tb = topLevel[b];
        if (!ta || !tb) return null;
        const isHovered = hoveredId === ta.id || hoveredId === tb.id;
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

      {/* ── Sub-territory connector lines ──────────────────────────────────────
          Colour rule:
            · Both parent and sub controlled by the same faction → faction colour
            · Otherwise → neutral gold
      ─────────────────────────────────────────────────────────────────────────── */}
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

      {/* ── Sub-territory nodes ──────────────────────────────────────────────── */}
      {subLevel.map(sub => {
        const isHov    = hoveredId === sub.id;
        const domId    = dominantFactionId(sub);
        // Use faction colour if controlled, otherwise bright neutral gold
        const subColour = domId
          ? (factionColour[domId] || GOLD_HEX)
          : GOLD_NEUTRAL_HEX;

        return (
          <g
            key={sub.id}
            style={{ cursor: 'pointer' }}
            onClick={() => handleNodeClick(sub)}
            onMouseEnter={() => setHoveredId(sub.id)}
            onMouseLeave={() => { setHoveredId(null); setTooltip(null); }}
            onMouseMove={e => handleMouseMove(e, sub)}
          >
            {/* Hover glow */}
            {isHov && (
              <circle
                cx={`${sub.x_pos}%`} cy={`${sub.y_pos}%`} r="2.2%"
                fill={`${subColour}18`} stroke={`${subColour}50`} strokeWidth="0.25"
              />
            )}
            {/* Node circle */}
            <circle
              cx={`${sub.x_pos}%`} cy={`${sub.y_pos}%`} r="1.2%"
              fill={isHov ? `${subColour}45` : `${subColour}28`}
              stroke={isHov ? subColour : `${subColour}bb`}
              strokeWidth={isHov ? '0.4' : '0.3'}
              style={{ transition: 'stroke 0.15s' }}
            />
            {/* Name label — only visible on hover */}
            {isHov && (
              <text
                x={`${sub.x_pos}%`}
                y={`${sub.y_pos + 2.2}%`}
                textAnchor="middle"
                fill="rgba(220,200,160,0.75)"
                fontSize="1.6"
                fontFamily="var(--font-display, sans-serif)"
                letterSpacing="0.06em"
                style={{ userSelect: 'none', textTransform: 'uppercase' }}
              >
                {sub.name.length > 14 ? sub.name.slice(0, 12) + '…' : sub.name}
              </text>
            )}
          </g>
        );
      })}

      {/* ── Top-level territory nodes ─────────────────────────────────────────── */}
      {topLevel.map(t => {
        const isHov = hoveredId === t.id;
        const cx    = `${t.x_pos}%`;
        const cy    = `${t.y_pos}%`;
        const cxN   = t.x_pos;
        const cyN   = t.y_pos;

        const domId = dominantFactionId(t);
        // Controlled → faction colour; Neutral → brighter gold
        const baseColour = domId
          ? (factionColour[domId] || GOLD_HEX)
          : GOLD_NEUTRAL_HEX;

        const dimColour  = domId ? `${baseColour}88` : `${GOLD_NEUTRAL_HEX}cc`;
        const ringColour = isHov ? baseColour : domId ? `${baseColour}88` : `${GOLD_NEUTRAL_HEX}cc`;

        return (
          <g
            key={t.id}
            style={{ cursor: 'pointer' }}
            onClick={() => handleNodeClick(t)}
            onMouseEnter={() => setHoveredId(t.id)}
            onMouseLeave={() => { setHoveredId(null); setTooltip(null); }}
            onMouseMove={e => handleMouseMove(e, t)}
          >
            {/* Hover glow */}
            {isHov && (
              <circle cx={cx} cy={cy} r="4.5%"
                fill={`${baseColour}18`} stroke={`${baseColour}40`} strokeWidth="0.3"
              />
            )}
            {/* Faction pulse ring — shown when controlled (not hovered) */}
            {domId && !isHov && (
              <circle cx={cx} cy={cy} r="3.6%"
                fill="none" stroke={`${baseColour}50`} strokeWidth="0.5"
              />
            )}
            {/* Main node ring */}
            <circle cx={cx} cy={cy} r="3.2%"
              fill="rgba(10,10,15,0.88)"
              stroke={ringColour}
              strokeWidth={isHov ? '0.5' : '0.38'}
              style={{ transition: 'stroke 0.15s, stroke-width 0.15s' }}
            />
            {/* Inner fill */}
            <circle cx={cx} cy={cy} r="2.2%"
              fill={isHov
                ? `${baseColour}30`
                : domId ? `${baseColour}14` : `${GOLD_NEUTRAL_HEX}18`}
              style={{ transition: 'fill 0.15s' }}
            />
            {/* Diamond icon */}
            <DiamondIcon
              cx={cxN} cy={cyN} size={1.4}
              fill={isHov ? baseColour : domId ? dimColour : GOLD_NEUTRAL_HEX}
            />
            {/* Territory name */}
            <text
              x={cx} y={`${cyN + 5}%`}
              textAnchor="middle"
              fill={isHov ? '#e8d5a0' : 'rgba(220,200,160,0.7)'}
              fontSize="2"
              fontFamily="var(--font-display, sans-serif)"
              letterSpacing="0.08em"
              style={{ transition: 'fill 0.15s', userSelect: 'none', textTransform: 'uppercase' }}
            >
              {t.name.length > 16 ? t.name.slice(0, 14) + '…' : t.name}
            </text>
          </g>
        );
      })}

      {/* ── Tooltip (rendered last so it sits on top) ─────────────────────────── */}
      {renderTooltip()}


    </svg>
  );
}
