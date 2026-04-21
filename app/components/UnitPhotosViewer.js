'use client';

import { useState } from 'react';

// Maps focal_point DB value → CSS object-position
function toObjPos(fp) {
  if (fp === 'top')    return 'center top';
  if (fp === 'bottom') return 'center bottom';
  return 'center';
}

// Client component that renders the unit portrait hero + additional photos grid
// with a shared lightbox. Replaces the static server-side JSX on the unit portrait page.
//
// photos: sorted array (portrait-first) from the server.
//         Each entry: { id, url, focal_point? }
export default function UnitPhotosViewer({ photos, unitName, armyName }) {
  const [lightbox, setLightbox] = useState(null); // photo url or null

  const portraitPhoto    = photos?.[0] ?? null;
  const additionalPhotos = (photos || []).slice(1);

  return (
    <>
      {/* ── Portrait hero (1:1 square) ──────────────────────── */}
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
        {portraitPhoto ? (
          <img
            src={portraitPhoto.url}
            alt={`${unitName}${armyName ? ` — ${armyName}` : ''}`}
            onClick={() => setLightbox(portraitPhoto.url)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: toObjPos(portraitPhoto.focal_point),
              cursor: 'zoom-in',
              display: 'block',
            }}
          />
        ) : (
          // Placeholder when no photo has been uploaded yet
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

      {/* ── Additional photos grid ───────────────────────────── */}
      {additionalPhotos.length > 0 && (
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
            {additionalPhotos.map(photo => (
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
      )}

      {/* ── Lightbox ─────────────────────────────────────────── */}
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
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
