'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Build adjacency connections for top-level territories arranged in a circle.
// Each node connects to its immediate neighbours, plus cross-connections for
// larger maps to make the network feel alive.
function buildConnections(nodes) {
  const n = nodes.length;
  if (n < 2) return [];
  const edges = new Set();
  const add = (a, b) => {
    const key = [Math.min(a, b), Math.max(a, b)].join('-');
    edges.add(key);
  };
  // Ring connections
  for (let i = 0; i < n; i++) add(i, (i + 1) % n);
  // Cross-connections for larger maps
  if (n >= 6)  for (let i = 0; i < n; i += 3) add(i, (i + Math.floor(n / 2)) % n);
  if (n >= 10) for (let i = 1; i < n; i += 4) add(i, (i + Math.floor(n / 3)) % n);
  return [...edges].map(k => k.split('-').map(Number));
}

// Subtle star-field background for Gothic Sci-Fi / Space Opera
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

// Diamond icon for territory nodes
function DiamondIcon({ cx, cy, size, fill, stroke, opacity = 1 }) {
  const h = size * 0.6;
  const w = size * 0.45;
  const points = `${cx},${cy - h} ${cx + w},${cy} ${cx},${cy + h} ${cx - w},${cy}`;
  return <polygon points={points} fill={fill} stroke={stroke} strokeWidth="0.4" opacity={opacity} />;
}

const SETTING_BG = {
  'Gothic Sci-Fi': { bg: '#060608', grid: 'rgba(183,140,64,0.04)' },
  'Space Opera':   { bg: '#04050e', grid: 'rgba(100,140,220,0.04)' },
  'High Fantasy':  { bg: '#060a06', grid: 'rgba(80,160,80,0.04)'  },
  'Historical':    { bg: '#080706', grid: 'rgba(180,140,80,0.04)' },
  'Custom':        { bg: '#060608', grid: 'rgba(183,140,64,0.04)' },
};

// Default gold colour for uncontrolled/unknown territories
const GOLD = 'rgba(183,140,64,1)';
const GOLD_DIM = 'rgba(183,140,64,0.35)';
const GOLD_MID = 'rgba(183,140,64,0.5)';

export default function CampaignMap({ territories, factions, influenceData = [], campaignSlug, setting }) {
  const router = useRouter();
  const [hoveredId, setHoveredId] = useState(null);
  const [tooltip, setTooltip]     = useState(null); // { x, y, territory }

  const topLevel = territories.filter(t => t.depth === 1);
  const subLevel  = territories.filter(t => t.depth === 2);
  const connections = buildConnections(topLevel);

  const theme = SETTING_BG[setting] || SETTING_BG['Custom'];
  const isScifi = setting === 'Gothic Sci-Fi' || setting === 'Space Opera';

  // Build a quick lookup: faction id → faction colour
  const factionColour = Object.fromEntries((factions || []).map(f => [f.id, f.colour]));

  // For a given territory, return the faction id with the highest influence (if any > 0),
  // falling back to controlling_faction_id, then null.
  function dominantFactionId(territory) {
    const rows = influenceData.filter(i => i.territory_id === territory.id && i.influence_points > 0);
    if (rows.length > 0) {
      rows.sort((a, b) => b.influence_points - a.influence_points);
      return rows[0].faction_id;
    }
    return territory.controlling_faction_id || null;
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

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      style={{ background: theme.bg, display: 'block', cursor: 'default' }}
      onMouseLeave={() => { setHoveredId(null); setTooltip(null); }}
    >
      {/* Background: star field or grid */}
      {isScifi ? (
        <StarField count={120} />
      ) : (
        // Subtle grid lines for fantasy/historical
        <>
          {Array.from({ length: 10 }, (_, i) => (
            <line key={`h${i}`} x1="0" y1={`${i * 10}%`} x2="100%" y2={`${i * 10}%`} stroke={theme.grid} strokeWidth="0.3" />
          ))}
          {Array.from({ length: 10 }, (_, i) => (
            <line key={`v${i}`} x1={`${i * 10}%`} y1="0" x2={`${i * 10}%`} y2="100%" stroke={theme.grid} strokeWidth="0.3" />
          ))}
        </>
      )}

      {/* Outer decorative ring */}
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

      {/* Sub-territory connectors (thin lines from parent to child) */}
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

      {/* Sub-territory nodes (smaller, dimmer) */}
      {subLevel.map(sub => {
        const subColour = sub.controlling_faction_id
          ? factionColour[sub.controlling_faction_id] || GOLD_DIM
          : 'rgba(183,140,64,0.25)';
        return (
          <g key={sub.id} style={{ cursor: 'pointer' }} onClick={() => handleNodeClick(sub)}>
            <circle
              cx={`${sub.x_pos}%`} cy={`${sub.y_pos}%`} r="1.2%"
              fill={`${subColour}20`} stroke={subColour} strokeWidth="0.25"
            />
          </g>
        );
      })}

      {/* Top-level territory nodes */}
      {topLevel.map(t => {
        const isHov = hoveredId === t.id;
        const cx = `${t.x_pos}%`;
        const cy = `${t.y_pos}%`;
        const cxN = t.x_pos;
        const cyN = t.y_pos;

        // Colour by dominant influence faction, then controlling faction, then neutral gold
        const domId = dominantFactionId(t);
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
            {/* Glow ring when hovered */}
            {isHov && (
              <circle cx={cx} cy={cy} r="4.5%"
                fill={glowColour}
                stroke={`${baseColour}40`}
                strokeWidth="0.3"
              />
            )}

            {/* Outer accent ring when a faction is dominant */}
            {domId && !isHov && (
              <circle cx={cx} cy={cy} r="3.6%"
                fill="none"
                stroke={`${baseColour}50`}
                strokeWidth="0.5"
              />
            )}

            {/* Outer ring */}
            <circle cx={cx} cy={cy} r="3.2%"
              fill="rgba(10,10,15,0.9)"
              stroke={ringColour}
              strokeWidth={isHov ? '0.5' : '0.35'}
              style={{ transition: 'stroke 0.15s, stroke-width 0.15s' }}
            />
            {/* Inner fill — tinted by dominant faction colour */}
            <circle cx={cx} cy={cy} r="2.2%"
              fill={isHov ? `${baseColour}25` : domId ? `${baseColour}12` : 'rgba(183,140,64,0.07)'}
              style={{ transition: 'fill 0.15s' }}
            />
            {/* Diamond icon — uses dominant faction colour */}
            <DiamondIcon
              cx={cxN} cy={cyN} size={1.4}
              fill={isHov ? baseColour : domId ? dimColour : GOLD_MID}
              stroke="none"
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

      {/* Tooltip */}
      {tooltip && (
        <g>
          <rect
            x={`${Math.min(tooltip.x + 2, 62)}%`}
            y={`${Math.min(tooltip.y - 10, 80)}%`}
            width="36%" height="8%"
            fill="rgba(10,10,15,0.95)"
            stroke="rgba(183,140,64,0.4)"
            strokeWidth="0.3"
            rx="0.5"
          />
          <text
            x={`${Math.min(tooltip.x + 20, 80)}%`}
            y={`${Math.min(tooltip.y - 5.5, 85)}%`}
            textAnchor="middle"
            fill="rgba(183,140,64,0.9)"
            fontSize="1.8"
            fontFamily="var(--font-display, sans-serif)"
            letterSpacing="0.1em"
            style={{ userSelect: 'none', textTransform: 'uppercase' }}
          >
            {tooltip.territory.name}
          </text>
          <text
            x={`${Math.min(tooltip.x + 20, 80)}%`}
            y={`${Math.min(tooltip.y - 3, 87)}%`}
            textAnchor="middle"
            fill="rgba(200,180,140,0.5)"
            fontSize="1.5"
            fontFamily="serif"
            fontStyle="italic"
            style={{ userSelect: 'none' }}
          >
            {dominantFactionId(tooltip.territory)
              ? factions?.find(f => f.id === dominantFactionId(tooltip.territory))?.name || 'Controlled'
              : tooltip.territory.type || 'Click to view'
            }
          </text>
        </g>
      )}

      {/* Centre compass rose */}
      <g opacity="0.12">
        <line x1="50%" y1="46%" x2="50%" y2="54%" stroke="#b78c40" strokeWidth="0.3" />
        <line x1="46%" y1="50%" x2="54%" y2="50%" stroke="#b78c40" strokeWidth="0.3" />
        <polygon points="50,46 50.6,47.2 49.4,47.2" fill="#b78c40" />
      </g>
    </svg>
  );
}
