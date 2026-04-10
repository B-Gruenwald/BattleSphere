'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteCampaignButton({ campaignId, campaignName }) {
  const router = useRouter();
  const [phase,   setPhase]   = useState('idle'); // idle | confirm | deleting | error
  const [errMsg,  setErrMsg]  = useState('');

  async function handleDelete() {
    setPhase('deleting');
    try {
      const res  = await fetch('/api/admin/delete-campaign', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ campaignId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setErrMsg(data.error ?? 'Something went wrong.');
        setPhase('error');
      } else {
        router.push('/admin');
      }
    } catch {
      setErrMsg('Network error — please try again.');
      setPhase('error');
    }
  }

  if (phase === 'idle') {
    return (
      <button
        type="button"
        onClick={() => setPhase('confirm')}
        style={{
          padding:       '0.5rem 1rem',
          background:    'transparent',
          color:         '#e05a5a',
          border:        '1px solid rgba(224,90,90,0.4)',
          fontFamily:    'var(--font-display)',
          fontSize:      '0.58rem',
          fontWeight:    '700',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          cursor:        'pointer',
        }}
      >
        Delete Campaign
      </button>
    );
  }

  if (phase === 'confirm') {
    return (
      <div style={{
        display:    'flex',
        alignItems: 'center',
        gap:        '0.75rem',
        background: 'rgba(224,90,90,0.06)',
        border:     '1px solid rgba(224,90,90,0.35)',
        padding:    '0.5rem 1rem',
      }}>
        <span style={{ fontSize: '0.82rem', color: '#e07070' }}>
          Delete <strong>{campaignName}</strong>? This cannot be undone.
        </span>
        <button
          type="button"
          onClick={handleDelete}
          style={{
            padding:       '0.3rem 0.85rem',
            background:    'rgba(224,90,90,0.15)',
            color:         '#e05a5a',
            border:        '1px solid #e05a5a',
            fontFamily:    'var(--font-display)',
            fontSize:      '0.58rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            cursor:        'pointer',
          }}
        >
          Yes, Delete
        </button>
        <button
          type="button"
          onClick={() => setPhase('idle')}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.82rem' }}
        >
          Cancel
        </button>
      </div>
    );
  }

  if (phase === 'deleting') {
    return (
      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
        Deleting…
      </span>
    );
  }

  if (phase === 'error') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '0.82rem', color: '#e07070' }}>✗ {errMsg}</span>
        <button
          type="button"
          onClick={() => setPhase('idle')}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}
        >
          Retry
        </button>
      </div>
    );
  }

  return null;
}
