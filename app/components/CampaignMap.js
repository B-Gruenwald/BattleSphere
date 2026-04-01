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

function StarField({ count = 80 }) {
  const stars = Array.from({ length: count }, (_, i) => ({
    cx: ((i * 137.5) % 100),
    cy: ((i * 97.3) % 100),
    r: i % 7 === 0 ? 0.3 : 0.15,
    opacity: 0.2 + (i % 5) * 0.07,
  }));
  return (
    <>
      {stars.map((s, i) => (
        <circle key={i} cx={`${s.cx}%`} cy={`${s.cy}%`} r={s.r * 6} fill="white" opacity={s.opacity} />
      ))}
    </>
  );
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

const GOLD     = 'rgba(183,140,64,1)';
const GOLD_DIM = 'rgba(183,140,64,0.35)';
const GOLD_MID = 'rgba(183,140,64,0.5)';

export default function CampaignMap({ territories, factions, influenceData = [], campaignSlug, setting }) {
  const router = useRouter();
  const [hoveredId, setHoveredId] = useState(null);
  const [tooltip, setTooltip]     = useState(null); // { x, y, territory }

  const topLevel   = territories.filter(t => t.depth === 1);
  const subLevel   = territories.filter(t => t.depth === 2);
  const connections = buildConnections(topLevel);

  const theme   = SETTING_BG[setting] || SETTING_BG['Custom'];
  const isScifi = setting === 'Gothic Sci-Fi' || setting === 'Space Opera';

  const factionColour = Object.fromEntries((factions || []).map(f => [f.id, f.colour]));

  // Return the faction id with the highest influence for a territory,
  // falling back to controlling_faction_id, then null.
  function dominantFactionId(territory) {
    const rows = influenceData.filter(i => i.territory_id === territory.id && i.influence_points > 0);
    if (rows.length > 0) {
      rows.sort((a, b) => b.influence_points - a.influence_points);
      return rows[0].faction_id;
    }
    return territory.controlling_faction_id || null;
  }

  // Sorted influence rows for a territory (factions with > 0 points only)
  function influenceRows(territory) {
    return influenceData
      .filter(i => i.territory_id === territory.id && i.influence_points > 0)
      .sort((a, b) => b.influence_points - a.influence_points);
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

    // Tooltip dimensions (SVG viewBox units, not px)
    const TW      = 36;                           // tooltip width
    const ROW_H   = 2.5;                          // height per influence row
    const TH      = 8.5 + Math.max(1, rows.length) * ROW_H; // dynamic height

    // Position: prefer right of cursor, clamp to viewport; appear above cursor
    const TX = Math.min(tooltip.x + 2, 100 - TW - 1);
    const TY = Math.max(1, tooltip.y - TH - 2);

    // Y positions for each text element inside the box
    const nameY   = TY + 3.0;
    const typeY   = TY + 5.0;
    const divY    = TY + 6.2;
    const firstRowY = TY + 8.0;

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
              {/* Faction colour dot */}
              <DiamondIcon
                cx={TX + 3.2} cy={ry - 0.5} size={0.9}
                fill={faction.colour}
              />
              {/* Faction name */}
              <text
                x={`${TX + 5}%`} y={`${ry}%`}
                fill="rgba(220,200,160,0.8)"
                fontSize="1.55"
                fontFamily="var(--font-display, sans-serif)"
                style={{ userSelect: 'none' }}
              >
                {faction.name.length > 14 ? faction.name.slice(0, 12) + '…' : faction.name}
              </text>
              {/* Influence points — right-aligned */}
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
      {/* Background */}
      {isScifi ? (
        <StarField count={120} />
      ) : (
        <>
          {Array.from({ length: 10 }, (_, i) => (
            <line key={`h${i}`} x1="0" y1={`${i * 10}%`} x2="100%" y2={`${i * 10}%`} stroke={theme.grid} strokeWidth="0.3" />
          ))}
          {Array.from({ length: 10 }, (_, i) => (
            <line key={`v${i}`} x1={`${i * 10}%`} y1="0" x2={`${i * 10}%`} y2="100%" stroke={theme.grid} strokeWidth="0.3" />
          ))}
        </>
      )}

      {/* Outer decorative rings */}
      <circle cx="50%" cy="50%" r="44%" fill="none" stroke="rgba(183,140,64,0.06)" strokeWidth="0.4" />
      <circle cx="50%" cy="50%" r="42%" fill="none" stroke="rgba(183,140,64,0.04)" strokeWidth="0.2" />

      {/* Warp route connections */}
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
            stroke={isHovered ? 'rgba(183,140,64,0.5)' : 'rgba(183,140,64,0.15)'}
            strokeWidth={isHovered ? '0.4' : '0.25'}
            strokeDasharray="1.2 0.8"
            style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
          />
        );
      })}

      {/* Sub-territory connectors */}
      {subLevel.map(sub => {
        const parent = topLevel.find(t => t.id === sub.parent_id);
        if (!parent) return null;
        return (
          <line
            key={sub.id}
            x1={`${parent.x_pos}%`} y1={`${parent.y_pos}%`}
            x2={`${sub.x_pos}%`}   y2={`${sub.y_pos}%`}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="0.2"
          />
        );
      })}

      {/* ── Sub-territory nodes ── */}
      {subLevel.map(sub => {
        const isHov    = hoveredId === sub.id;
        const domId    = dominantFactionId(sub);
        const subColour = domId
          ? factionColour[domId] || GOLD_DIM
          : 'rgba(183,140,64,0.3)';

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
              fill={isHov ? `${subColour}35` : `${subColour}20`}
              stroke={isHov ? subColour : `${subColour}90`}
              strokeWidth={isHov ? '0.4' : '0.25'}
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

      {/* ── Top-level territory nodes ── */}
      {topLevel.map(t => {
        const isHov = hoveredId === t.id;
        const cx    = `${t.x_pos}%`;
        const cy    = `${t.y_pos}%`;
        const cxN   = t.x_pos;
        const cyN   = t.y_pos;

        const domId      = dominantFactionId(t);
        const baseColour = domId ? factionColour[domId] || GOLD : GOLD;
        const dimColour  = domId ? `${baseColour}88` : GOLD_DIM;
        const ringColour = isHov ? baseColour : domId ? `${baseColour}88` : GOLD_DIM;
        const glowColour = `${baseColour}15`;

        return (
          <g
            key={t.id}
            style={{ cursor: 'pointer' }}
            onClick={() => handleNodeClick(t)}
            onMouseEnter={() => setHoveredId(t.id)}
            onMouseLeave={() => { setHoveredId(null); setTooltip(null); }}
            onMouseMove={e => handleMouseMove(e, t)}
          >
            {isHov && (
              <circle cx={cx} cy={cy} r="4.5%"
                fill={glowColour} stroke={`${baseColour}40`} strokeWidth="0.3"
              />
            )}
            {domId && !isHov && (
              <circle cx={cx} cy={cy} r="3.6%"
                fill="none" stroke={`${baseColour}50`} strokeWidth="0.5"
              />
            )}
            <circle cx={cx} cy={cy} r="3.2%"
              fill="rgba(10,10,15,0.9)"
              stroke={ringColour}
              strokeWidth={isHov ? '0.5' : '0.35'}
              style={{ transition: 'stroke 0.15s, stroke-width 0.15s' }}
            />
            <circle cx={cx} cy={cy} r="2.2%"
              fill={isHov ? `${baseColour}25` : domId ? `${baseColour}12` : 'rgba(183,140,64,0.07)'}
              style={{ transition: 'fill 0.15s' }}
            />
            <DiamondIcon
              cx={cxN} cy={cyN} size={1.4}
              fill={isHov ? baseColour : domId ? dimColour : GOLD_MID}
            />
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

      {/* ── Tooltip (rendered last so it sits on top) ── */}
      {renderTooltip()}

      {/* Centre compass rose */}
      <g opacity="0.12">
        <line x1="50%" y1="46%" x2="50%" y2="54%" stroke="#b78c40" strokeWidth="0.3" />
        <line x1="46%" y1="50%" x2="54%" y2="50%" stroke="#b78c40" strokeWidth="0.3" />
        <polygon points="50,46 50.6,47.2 49.4,47.2" fill="#b78c40" />
      </g>
    </svg>
  );
}
