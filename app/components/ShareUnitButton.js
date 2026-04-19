'use client';

import { useState } from 'react';

// Exposes two actions on a unit portrait page:
//   1. "Download Share Image" — pulls a 1080x1080 branded PNG for Instagram/Discord.
//   2. "Copy Link" — copies the unit portrait URL to clipboard.
// Share-image action is hidden when the unit has no photo yet.

export default function ShareUnitButton({ unitId, hasPhoto, unitName }) {
  const [downloading, setDownloading] = useState(false);
  const [copied,      setCopied]      = useState(false);
  const [error,       setError]       = useState(null);

  async function handleDownload() {
    if (!hasPhoto || downloading) return;
    setError(null);
    setDownloading(true);
    try {
      const res = await fetch(`/api/units/${unitId}/share-image?download=1`);
      if (!res.ok) throw new Error(`Failed to generate image (${res.status})`);
      const blob    = await res.blob();
      const objUrl  = URL.createObjectURL(blob);
      const link    = document.createElement('a');
      const slug    = (unitName || 'unit').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'unit';
      link.href     = objUrl;
      link.download = `battlesphere-${slug}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objUrl);
    } catch (err) {
      setError(err.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  }

  async function handleCopy() {
    try {
      const url = `${window.location.origin}/units/${unitId}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Unable to copy link — try selecting the URL bar.');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {hasPhoto && (
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="btn-primary"
            style={{
              fontSize: '0.78rem',
              opacity: downloading ? 0.6 : 1,
              cursor: downloading ? 'wait' : 'pointer',
            }}
            title="Download a 1080×1080 branded image ready to post on Instagram, Discord, etc."
          >
            {downloading ? 'Preparing…' : 'Download Share Image'}
          </button>
        )}
        <button
          onClick={handleCopy}
          className="btn-secondary"
          style={{ fontSize: '0.78rem' }}
          title="Copy the portrait page URL"
        >
          {copied ? 'Link copied ✓' : 'Copy Link'}
        </button>
      </div>
      {!hasPhoto && (
        <p style={{
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          fontStyle: 'italic',
          margin: 0,
        }}>
          Upload a photo to enable the share image.
        </p>
      )}
      {error && (
        <p style={{
          fontSize: '0.72rem',
          color: '#e05a5a',
          margin: 0,
        }}>
          {error}
        </p>
      )}
    </div>
  );
}
