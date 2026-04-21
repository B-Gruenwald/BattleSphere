'use client';

import { useState } from 'react';

function toObjPos(fp) {
  if (fp === 'top')    return 'center top';
  if (fp === 'bottom') return 'center bottom';
  return 'center';
}

// Portrait hero for the unit detail page: square crop with lightbox on click.
// Shows a placeholder diamond when no photo has been uploaded yet.
// photo: { url, focal_point? } or null
export default function UnitPortraitHero({ photo, unitName, armyName }) {
  const [lightbox, setLightbox] = useState(false);

  return (
    <>
      <div style={{
        width: '100%',
        aspectRatio: '1 / 1',
        overflow: 'hidden',
        marginBottom: '1.25rem',
        border: '1px solid var(--border-dim)',
        background: 'var(--bg-surface)',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {photo ? (
          <img
            src={photo.url}
            alt={`${unitName}${armyName ? ` — ${armyName}` : ''}`}
            onClick={() => setLightbox(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: toObjPos(photo.focal_point),
              cursor: 'zoom-in',
              display: 'block',
            }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{
              width: '16px', height: '16px',
              background: 'var(--gold)',
              transform: 'rotate(45deg)',
              margin: '0 auto 1rem',
              opacity: 0.4,
            }} />
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.62rem',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}>
              Portrait not yet painted
            </p>
          </div>
        )}
      </div>

      {lightbox && photo && (
        <div
          onClick={() => setLightbox(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out', padding: '2rem',
          }}
        >
          <img
            src={photo.url}
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
            onClick={() => setLightbox(false)}
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
