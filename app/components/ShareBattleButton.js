'use client';

import { useState } from 'react';

// Simple "Copy Link" button for battle detail pages.
// battleUrl: the full absolute URL to copy.
export default function ShareBattleButton({ battleUrl }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(battleUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback for browsers that block clipboard API
      window.prompt('Copy this link:', battleUrl);
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="btn-secondary"
      style={{ fontSize: '0.82rem' }}
    >
      {copied ? '✓ Copied!' : 'Copy Link'}
    </button>
  );
}
