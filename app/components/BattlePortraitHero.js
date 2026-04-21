'use client';

import { useState } from 'react';

function toObjPos(fp) {
  if (fp === 'top')    return 'center top';
  if (fp === 'bottom') return 'center bottom';
  return 'center';
}

// Portrait hero for the battle detail page.
// Shows the battle's portrait photo (first is_portrait, or first photo) in a
// 16:9 crop with a click-to-enlarge lightbox.
// photo: { url, focal_point? } or null — if null, renders nothing.
export default function BattlePortraitHero({ photo }) {
  const [lightbox, setLightbox] = useState(false);

  if (!photo) return null;

  return (
    <>
      <div
        onClick={() => setLightbox(true)}
        style={{
          width: '100%',
          aspectRatio: '16 / 9',
          overflow: 'hidden',
          marginBottom: '1.75rem',
          border: '1px solid var(--border-dim)',
          cursor: 'zoom-in',
        }}
      >
        <img
          src={photo.url}
          alt="Battle"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: toObjPos(photo.focal_point),
            display: 'block',
          }}
        />
      </div>

      {lightbox && (
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
            alt="Battle"
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
