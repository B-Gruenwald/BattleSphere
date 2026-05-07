'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function RemovePlayerButton({ userId, campaignId }) {
  const supabase = createClient();
  const router   = useRouter();

  const [confirm,  setConfirm]  = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error,    setError]    = useState('');

  async function remove() {
    setRemoving(true);
    const { error: err } = await supabase
      .from('campaign_members')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('user_id', userId);
    setRemoving(false);
    if (err) { setError(err.message); return; }
    router.refresh();
  }

  if (error) return (
    <span style={{ color: '#e05a5a', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>{error}</span>
  );

  if (!confirm) return (
    <button
      onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirm(true); }}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: '0.68rem', color: 'var(--text-muted)',
        fontFamily: 'var(--font-display)', letterSpacing: '0.06em',
        padding: '0.15rem 0.35rem', opacity: 0.6,
        whiteSpace: 'nowrap',
      }}
    >
      Remove
    </button>
  );

  return (
    <div
      onClick={e => { e.preventDefault(); e.stopPropagation(); }}
      style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}
    >
      <span style={{ fontSize: '0.68rem', color: '#e05a5a', whiteSpace: 'nowrap' }}>Sure?</span>
      <button
        onClick={remove}
        disabled={removing}
        style={{
          background: 'rgba(224,90,90,0.1)', border: '1px solid #e05a5a',
          color: '#e05a5a', cursor: removing ? 'not-allowed' : 'pointer',
          fontSize: '0.62rem', padding: '0.15rem 0.45rem',
          opacity: removing ? 0.6 : 1,
          fontFamily: 'var(--font-display)', letterSpacing: '0.06em',
        }}
      >
        {removing ? '…' : 'Yes'}
      </button>
      <button
        onClick={() => setConfirm(false)}
        style={{
          background: 'none', border: 'none', color: 'var(--text-muted)',
          cursor: 'pointer', fontSize: '0.75rem', padding: '0.1rem 0.25rem',
        }}
      >
        ✕
      </button>
    </div>
  );
}
