'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

// ── Constants ─────────────────────────────────────────────────────────────────
const GOLD      = '#b78c40';
const GOLD_DIM  = 'rgba(183,140,64,0.35)';
const RED       = '#e05a5a';

// ── Collision separation (same approach as CampaignMap) ───────────────────────
function separateNodes(nodes, minDist = 12, iterations = 150) {
  if (nodes.length < 2) return nodes;
  const pts = nodes.map((n, i) => ({ ...n, x: n.x + i * 0.05, y: n.y + i * 0.03 }));
  for (let iter = 0; iter < iterations; iter++) {
    let maxMove = 0;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[j].x - pts[i].x, dy = pts[j].y - pts[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          const nx = dist > 0.0001 ? dx / dist : 1;
          const ny = dist > 0.0001 ? dy / dist : 0;
          const push = (minDist - dist) / 2;
          pts[i].x -= nx * push; pts[i].y -= ny * push;
          pts[j].x += nx * push; pts[j].y += ny * push;
          maxMove = Math.max(maxMove, push);
        }
      }
    }
    pts.forEach(p => {
      p.x = Math.max(10, Math.min(90, p.x));
      p.y = Math.max(10, Math.min(85, p.y));
    });
    if (maxMove < 0.01) break;
  }
  return pts;
}

// ── Normalise top-level positions to fit the SVG canvas ───────────────────────
function buildDisplayNodes(territories) {
  const tops = territories.filter(t => !t.parent_id && t.x_pos != null && t.y_pos != null);
  if (tops.length === 0) return [];

  const X1 = 10, X2 = 90, Y1 = 10, Y2 = 82;
  const cx = (X1 + X2) / 2;
  const cy = (Y1 + Y2) / 2;

  const xs     = tops.map(t => t.x_pos);
  const ys     = tops.map(t => t.y_pos);
  const minX   = Math.min(...xs), maxX = Math.max(...xs);
  const minY   = Math.min(...ys), maxY = Math.max(...ys);
  const dataW  = maxX - minX || 1;
  const dataH  = maxY - minY || 1;
  const scale  = Math.min((X2 - X1) / dataW, (Y2 - Y1) / dataH) * 0.85;
  const rawCx  = (minX + maxX) / 2;
  const rawCy  = (minY + maxY) / 2;

  const scaled = tops.map(t => ({
    ...t,
    x: Math.round((cx + (t.x_pos - rawCx) * scale) * 10) / 10,
    y: Math.round((cy + (t.y_pos - rawCy) * scale) * 10) / 10,
  }));

  return separateNodes(scaled, 12);
}

// ── Main component ─────────────────────────────────────────────────────────────
// Props:
//   territories    — full territory array from DB
//   initialRoutes  — warp_routes rows: [{ id, territory_a, territory_b }, ...]
//   campaignId     — uuid of the campaign

export default function MapRouteEditor({ territories, initialRoutes, campaignId }) {
  const supabase = createClient();

  const [routes,     setRoutes]     = useState(initialRoutes || []);
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId,  setHoveredId]  = useState(null);
  const [status,     setStatus]     = useState(null); // { msg, ok }
  const [busy,       setBusy]       = useState(false);

  // Normalised display positions (memo — territories don't change)
  const nodes = useMemo(() => buildDisplayNodes(territories), [territories]);

  // Fast lookup set: "minId|maxId" for each existing route
  const routeSet = useMemo(() => {
    const s = new Set();
    routes.forEach(r => s.add([r.territory_a, r.territory_b].sort().join('|')));
    return s;
  }, [routes]);

  function hasRoute(idA, idB) {
    return routeSet.has([idA, idB].sort().join('|'));
  }

  function flash(msg, ok = true) {
    setStatus({ msg, ok });
    setTimeout(() => setStatus(null), 2500);
  }

  async function toggleRoute(idA, idB) {
    if (busy) return;
    setBusy(true);
    const [a, b] = [idA, idB].sort(); // always insert/delete in consistent order

    if (hasRoute(a, b)) {
      // ── Remove ──
      const { error } = await supabase
        .from('warp_routes')
        .delete()
        .eq('campaign_id', campaignId)
        .or(`and(territory_a.eq.${a},territory_b.eq.${b}),and(territory_a.eq.${b},territory_b.eq.${a})`);
      if (error) { flash('Error: ' + error.message, false); }
      else {
        setRoutes(prev => prev.filter(r => {
          const key = [r.territory_a, r.territory_b].sort().join('|');
          return key !== [a, b].join('|');
        }));
        flash('Route removed');
      }
    } else {
      // ── Add ──
      const { data, error } = await supabase
        .from('warp_routes')
        .insert({ campaign_id: campaignId, territory_a: a, territory_b: b })
        .select()
        .single();
      if (error) { flash('Error: ' + error.message, false); }
      else { setRoutes(prev => [...prev, data]); flash('Route added'); }
    }
    setBusy(false);
  }

  function handleNodeClick(t) {
    if (!selectedId) {
      setSelectedId(t.id);
      return;
    }
    if (selectedId === t.id) {
      setSelectedId(null);
      return;
    }
    // Toggle route between selectedId and this node
    toggleRoute(selectedId, t.id);
    setSelectedId(null);
  }

  const selectedNode = nodes.find(n => n.id === selectedId);
  const hoveredNode  = nodes.find(n => n.id === hoveredId);

  return (
    <div>
      {/* ── Instruction bar ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', minHeight: '1.6rem' }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.58rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: selectedId ? GOLD : 'var(--text-muted)',
        }}>
          {selectedId
            ? `"${selectedNode?.name || '…'}" selected → click another territory to add/remove a route`
            : 'Click a territory to select it, then click another to toggle a warp route'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {selectedId && (
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', padding: '0' }}
            >
              ✕ cancel
            </button>
          )}
          {status && (
            <span style={{ fontSize: '0.8rem', color: status.ok ? GOLD : RED }}>
              {status.msg}
            </span>
          )}
        </div>
      </div>

      {/* ── SVG canvas ────────────────────────────────────────────────────── */}
      <div style={{ width: '100%', height: '400px', background: '#06060a', border: '1px solid var(--border-dim)', overflow: 'hidden' }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block', cursor: selectedId ? 'crosshair' : 'default' }}
          onMouseLeave={() => setHoveredId(null)}
        >
          {/* Background image + overlay */}
          <image href="/map-background.jpg" x="0" y="0" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
          <rect x="0" y="0" width="100%" height="100%" fill="rgba(5,5,10,0.65)" />

          {/* ── Existing routes ─────────────────────────────────────────── */}
          {routes.map(r => {
            const nA = nodes.find(n => n.id === r.territory_a);
            const nB = nodes.find(n => n.id === r.territory_b);
            if (!nA || !nB) return null;
            const highlight = selectedId === r.territory_a || selectedId === r.territory_b;
            return (
              <line
                key={r.id || `${r.territory_a}-${r.territory_b}`}
                x1={`${nA.x}%`} y1={`${nA.y}%`}
                x2={`${nB.x}%`} y2={`${nB.y}%`}
                stroke={highlight ? `${GOLD}aa` : `${GOLD}38`}
                strokeWidth={highlight ? '0.55' : '0.28'}
                strokeDasharray="1.2 0.8"
                style={{ transition: 'stroke 0.15s, stroke-width 0.15s' }}
              />
            );
          })}

          {/* ── Preview route (selected → hovered) ──────────────────────── */}
          {selectedNode && hoveredNode && hoveredId !== selectedId && !hasRoute(selectedId, hoveredId) && (
            <line
              x1={`${selectedNode.x}%`} y1={`${selectedNode.y}%`}
              x2={`${hoveredNode.x}%`}  y2={`${hoveredNode.y}%`}
              stroke={`${GOLD}55`}
              strokeWidth="0.35"
              strokeDasharray="0.7 0.6"
              style={{ pointerEvents: 'none' }}
            />
          )}

          {/* ── Territory nodes ──────────────────────────────────────────── */}
          {nodes.map(t => {
            const isSel      = t.id === selectedId;
            const isHov      = t.id === hoveredId;
            const wouldAdd   = selectedId && !isSel && !hasRoute(selectedId, t.id);
            const wouldRem   = selectedId && !isSel && hasRoute(selectedId, t.id);
            const ringColour = isSel
              ? GOLD
              : wouldRem
              ? RED
              : isHov
              ? `${GOLD}cc`
              : GOLD_DIM;

            return (
              <g
                key={t.id}
                style={{ cursor: 'pointer' }}
                onClick={() => handleNodeClick(t)}
                onMouseEnter={() => setHoveredId(t.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Outer glow ring for selected node */}
                {isSel && (
                  <circle cx={`${t.x}%`} cy={`${t.y}%`} r="5%"
                    fill={`${GOLD}14`} stroke={`${GOLD}55`} strokeWidth="0.3"
                  />
                )}
                {/* Hover hint ring for add/remove target */}
                {!isSel && isHov && selectedId && (
                  <circle cx={`${t.x}%`} cy={`${t.y}%`} r="4.5%"
                    fill={wouldRem ? `${RED}14` : `${GOLD}10`}
                    stroke={wouldRem ? `${RED}55` : `${GOLD}40`}
                    strokeWidth="0.25"
                  />
                )}
                {/* Main node circle */}
                <circle cx={`${t.x}%`} cy={`${t.y}%`} r="3.2%"
                  fill="rgba(10,10,15,0.88)"
                  stroke={ringColour}
                  strokeWidth={isSel ? '0.55' : '0.38'}
                  style={{ transition: 'stroke 0.12s, stroke-width 0.12s' }}
                />
                {/* Inner fill */}
                <circle cx={`${t.x}%`} cy={`${t.y}%`} r="2.1%"
                  fill={isSel ? `${GOLD}30` : isHov ? `${GOLD}12` : `${GOLD}07`}
                  style={{ transition: 'fill 0.12s' }}
                />
                {/* Diamond centre icon */}
                <polygon
                  points={`${t.x},${t.y - 1.3} ${t.x + 0.9},${t.y} ${t.x},${t.y + 1.3} ${t.x - 0.9},${t.y}`}
                  fill={isSel ? GOLD : wouldRem ? RED : isHov ? `${GOLD}cc` : GOLD_DIM}
                  strokeWidth="0"
                />
                {/* Label */}
                <text
                  x={`${t.x}%`} y={`${t.y + 5.2}%`}
                  textAnchor="middle"
                  fill={isSel ? '#e8d5a0' : 'rgba(220,200,160,0.65)'}
                  fontSize="1.8"
                  fontFamily="var(--font-display, sans-serif)"
                  letterSpacing="0.07em"
                  style={{ userSelect: 'none', textTransform: 'uppercase', pointerEvents: 'none', transition: 'fill 0.12s' }}
                >
                  {t.name.length > 14 ? t.name.slice(0, 12) + '…' : t.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── Footer hint ───────────────────────────────────────────────────── */}
      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic', marginTop: '0.5rem' }}>
        {routes.length} warp route{routes.length !== 1 ? 's' : ''} ·
        Gold ring = add route · Red ring = remove route · Changes save automatically
      </p>
    </div>
  );
}
