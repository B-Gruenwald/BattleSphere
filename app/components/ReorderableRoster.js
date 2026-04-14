'use client';

import { useState } from 'react';

const btnStyle = (active, reordering) => ({
  background: 'none',
  border: '1px solid var(--border-dim)',
  color: active ? 'var(--text-secondary)' : 'var(--border-dim)',
  cursor: active ? 'pointer' : 'default',
  padding: '0.15rem 0.45rem',
  fontSize: '0.75rem',
  fontFamily: 'inherit',
  lineHeight: 1,
  opacity: (!active || reordering) ? 0.35 : 1,
  transition: 'opacity 0.15s',
});

export default function ReorderableRoster({ initialUnits, armyId, isOwner, photosByUnit, userId }) {
  const [units,      setUnits]      = useState(initialUnits || []);
  const [reordering, setReordering] = useState(false);
  const [lightbox,   setLightbox]   = useState(null); // url string or null

  async function moveUnit(index, dir) {
    const swap = dir === 'up' ? index - 1 : index + 1;
    if (swap < 0 || swap >= units.length) return;

    const next = [...units];
    [next[index], next[swap]] = [next[swap], next[index]];
    setUnits(next);

    setReordering(true);
    try {
      await fetch('/api/army-units/reorder', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ armyId, ids: next.map(u => u.id) }),
      });
    } finally {
      setReordering(false);
    }
  }

  if (units.length === 0) return null;

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {units.map((unit, idx) => {
          const unitPhotos  = photosByUnit[unit.id] || [];
          const firstPhoto  = unitPhotos[0] ?? null;
          const canUp   = isOwner && idx > 0;
          const canDown = isOwner && idx < units.length - 1;

          return (
            <div key={unit.id} style={{ border: '1px solid var(--border-dim)', display: 'flex', alignItems: 'stretch' }}>

              {/* Content area */}
              <div style={{ flex: 1, padding: '1rem 1.25rem' }}>

                {/* Header row: name + type + reorder buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: unit.description ? '0.5rem' : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: '700', letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
                      {unit.name}
                    </h3>
                    {unit.unit_type && (
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.52rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                        {unit.unit_type}
                      </span>
                    )}
                  </div>

                  {/* ↑/↓ only visible to owner */}
                  {isOwner && (
                    <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                      <button
                        onClick={() => canUp && moveUnit(idx, 'up')}
                        disabled={!canUp || reordering}
                        title="Move up"
                        style={btnStyle(canUp, reordering)}
                      >↑</button>
                      <button
                        onClick={() => canDown && moveUnit(idx, 'down')}
                        disabled={!canDown || reordering}
                        title="Move down"
                        style={btnStyle(canDown, reordering)}
                      >↓</button>
                    </div>
                  )}
                </div>

                {unit.description && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                    {unit.description}
                  </p>
                )}
              </div>

              {/* First-photo thumbnail — far right, fills card height */}
              {firstPhoto && (
                <div
                  style={{
                    width: '64px',
                    flexShrink: 0,
                    borderLeft: '1px solid var(--border-dim)',
                    overflow: 'hidden',
                    cursor: 'zoom-in',
                  }}
                  onClick={() => setLightbox(firstPhoto.url)}
                  title="View photo"
                >
                  <img
                    src={firstPhoto.url}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out', padding: '2rem',
          }}
        >
          <img
            src={lightbox}
            alt=""
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '90vw', maxHeight: '90vh',
              objectFit: 'contain',
              border: '1px solid var(--border-dim)',
              cursor: 'default',
            }}
          />
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'fixed', top: '1.25rem', right: '1.5rem',
              background: 'none', border: 'none',
              color: 'var(--text-muted)', fontSize: '1.75rem',
              cursor: 'pointer', lineHeight: 1,
            }}
          >×</button>
        </div>
      )}
    </>
  );
}
