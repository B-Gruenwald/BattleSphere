'use client';

import { useState } from 'react';
import TerritoryImageUpload from './TerritoryImageUpload';

// Thin client wrapper: holds the live image URL in state so the page
// can show/hide the image immediately after upload without a full reload.
export default function TerritoryImageSection({ campaignId, territoryId, initialImageUrl, initialFocalPoint, isOrganiser }) {
  const [imageUrl,    setImageUrl]    = useState(initialImageUrl   || null);
  const [focalPoint,  setFocalPoint]  = useState(initialFocalPoint || 'center');

  const toObjPos = (fp) => fp === 'top' ? 'center top' : fp === 'bottom' ? 'center bottom' : 'center';

  if (!isOrganiser && !imageUrl) return null;

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      {/* Public view: image with correct focal point */}
      {imageUrl && !isOrganiser && (
        <div
          style={{
            width: '100%',
            maxHeight: '360px',
            overflow: 'hidden',
            border: '1px solid var(--border-dim)',
          }}
        >
          <img
            src={imageUrl}
            alt="Territory"
            style={{
              width: '100%',
              maxHeight: '360px',
              objectFit: 'cover',
              objectPosition: toObjPos(focalPoint),
              display: 'block',
            }}
          />
        </div>
      )}

      {/* Organiser: upload control with focal point toggle */}
      {isOrganiser && (
        <div style={{ border: '1px solid var(--border-dim)', padding: '1.75rem' }}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.65rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--text-gold)',
              marginBottom: '1.25rem',
            }}
          >
            Territory Image
          </h2>
          <TerritoryImageUpload
            campaignId={campaignId}
            territoryId={territoryId}
            currentImageUrl={imageUrl}
            currentFocalPoint={focalPoint}
            onImageChange={setImageUrl}
            onFocalPointChange={setFocalPoint}
          />
        </div>
      )}
    </div>
  );
}
