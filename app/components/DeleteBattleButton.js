'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { reverseInfluence, reverseEventBonuses, reverseTerritoryCascade } from '@/app/lib/influence';

export default function DeleteBattleButton({ battle, influenceMode }) {
  const router   = useRouter();
  const supabase = createClient();

  const [confirm,  setConfirm]  = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error,    setError]    = useState('');

  async function deleteBattle(e) {
    e.preventDefault();
    e.stopPropagation();
    setDeleting(true);
    setError('');

    await reverseInfluence(supabase, battle, influenceMode || 'standard');
    await reverseEventBonuses(supabase, battle);
    await reverseTerritoryCascade(supabase, battle);

    const { error: deleteError } = await supabase
      .from('battles')
      .delete()
      .eq('id', battle.id);

    if (deleteError) {
      setError(deleteError.message);
      setDeleting(false);
      setConfirm(false);
      return;
    }

    router.refresh();
  }

  if (error) return (
    <span
      onClick={e => { e.preventDefault(); e.stopPropagation(); }}
      style={{ color: '#e05a5a', fontSize: '0.68rem', whiteSpace: 'nowrap', flexShrink: 0 }}
    >
      {error}
    </span>
  );

  if (!confirm) return (
    <button
      onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirm(true); }}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: '0.62rem', color: 'var(--text-muted)',
        fontFamily: 'var(--font-display)', letterSpacing: '0.06em',
        padding: '0.15rem 0.35rem', opacity: 0.6, whiteSpace: 'nowrap', flexShrink: 0,
      }}
    >
      Delete
    </button>
  );

  return (
    <div
      onClick={e => { e.preventDefault(); e.stopPropagation(); }}
      style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}
    >
      <span style={{ fontSize: '0.62rem', color: '#e05a5a', whiteSpace: 'nowrap' }}>Sure?</span>
      <button
        onClick={deleteBattle}
        disabled={deleting}
        style={{
          background: 'rgba(224,90,90,0.1)', border: '1px solid #e05a5a',
          color: '#e05a5a', cursor: deleting ? 'not-allowed' : 'pointer',
          fontSize: '0.58rem', padding: '0.15rem 0.45rem',
          opacity: deleting ? 0.6 : 1,
          fontFamily: 'var(--font-display)', letterSpacing: '0.06em',
          whiteSpace: 'nowrap',
        }}
      >
        {deleting ? '…' : 'Yes'}
      </button>
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirm(false); }}
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
