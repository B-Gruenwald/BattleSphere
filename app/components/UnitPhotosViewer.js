'use client';

import { useState } from 'react';

function toObjPos(fp) {
  if (fp === 'top')    return 'center top';
  if (fp === 'bottom') return 'center bottom';
  return 'center';
}

// Additional photos gallery for the unit detail page.
// Pass `photos` as all photos EXCEPT the portrait (i.e. photos.slice(1)).
// Returns null when the list is empty so callers don't need to guard.
export default function UnitPhotosViewer({ photos }) {
  const [lightbox, setLightbox] = useState(null); // url or null

  if (!photos || photos.length === 0) return null;

  return (
    <>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.6rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--text-gold)',
          marginBottom: '0.75rem',
        }}>
          More Photos
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '0.6rem',
        }}>
          {photos.map(photo => (
            <div
              key={photo.id}
              onClick={() => setLightbox(photo.url)}
              style={{
                position: 'relative',
                paddingBottom: '100%',
                overflow: 'hidden',
                border: '1px solid var(--border-dim)',
                cursor: 'zoom-in',
              }}
            >
              <img
                src={photo.url}
                alt=""
                style={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                  objectPosition: toObjPos(photo.focal_point),
                }}
              />
            </div>
          ))}
        </div>
      </div>

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
