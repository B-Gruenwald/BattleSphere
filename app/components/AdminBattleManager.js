'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function AdminBattleManager({ battles, factions, slug }) {
  const router = useRouter();
  const supabase = createClient();

  const [confirmId,  setConfirmId]  = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error,      setError]      = useState('');

  const factionMap = Object.fromEntries((factions || []).map(f => [f.id, f]));

  async function handleDelete(battleId) {
    setDeletingId(battleId);
    setError('');

    const { error: deleteError } = await supabase
      .from('battles')
      .delete()
      .eq('id', battleId);

    if (deleteError) {
      setError('Could not delete battle: ' + deleteError.message);
      setDeletingId(null);
      setConfirmId(null);
      return;
    }

    // Refresh the page so the list updates
    setConfirmId(null);
    setDeletingId(null);
    router.refresh();
  }

  if (!battles || battles.length === 0) {
    return (
      <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>
        No battles have been logged yet.
      </p>
    );
  }

  const rowStyle = {
    display: 'flex', alignItems: 'center', gap: '1rem',
    padding: '0.85rem 0', borderBottom: '1px solid var(--border-dim)',
    flexWrap: 'wrap',
  };

  const dangerBtnStyle = {
    padding: '0.35rem 0.75rem', background: 'transparent',
    border: '1px solid #7a2020', color: '#e05a5a',
    fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.1em',
    textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
  };

  const dangerBtnConfirmStyle = {
    ...dangerBtnStyle,
    background: 'rgba(224,90,90,0.12)', border: '1px solid #e05a5a',
  };

  return (
    <div>
      {error && (
        <p style={{ color: '#e05a5a', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>
      )}

      {battles.map(battle => {
        const attacker  = factionMap[battle.attacker_faction_id];
        const defender  = factionMap[battle.defender_faction_id];
        const winner    = factionMap[battle.winner_faction_id];
        const isDraw    = !battle.winner_faction_id;
        const resultLabel = isDraw
          ? 'Draw'
          : battle.winner_faction_id === battle.attacker_faction_id
            ? `${attacker?.name ?? '?'} Victory`
            : `${defender?.name ?? '?'} Victory`;
        const resultColour = isDraw ? 'var(--text-muted)' : (winner?.colour ?? 'var(--text-gold)');
        const date = new Date(battle.created_at).toLocaleDateString('en-GB', {
          day: 'numeric', month: 'short', year: 'numeric',
        });

        const isConfirming = confirmId === battle.id;
        const isDeleting   = deletingId === battle.id;

        return (
          <div key={battle.id}>
            <div style={rowStyle}>
              {/* Result diamond */}
              <div style={{
                width: '7px', height: '7px',
                background: resultColour,
                transform: 'rotate(45deg)',
                flexShrink: 0,
              }} />

              {/* Battle info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.15rem' }}>
                  <span style={{ fontWeight: '600' }}>{attacker?.name ?? '?'}</span>
                  <span style={{ color: 'var(--text-muted)', margin: '0 0.4rem' }}>vs</span>
                  <span style={{ fontWeight: '600' }}>{defender?.name ?? '?'}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{
                    fontFamily: 'var(--font-display)', fontSize: '0.52rem',
                    letterSpacing: '0.1em', textTransform: 'uppercase', color: resultColour,
                  }}>
                    {resultLabel}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{date}</span>
                </div>
              </div>

              {/* View link */}
              <Link
                href={`/c/${slug}/battle/${battle.id}`}
                style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textDecoration: 'none', flexShrink: 0 }}
              >
                View →
              </Link>

              {/* Delete button */}
              {!isConfirming ? (
                <button
                  style={dangerBtnStyle}
                  onClick={() => { setConfirmId(battle.id); setError(''); }}
                >
                  Delete
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: '#e05a5a' }}>Sure?</span>
                  <button
                    style={{ ...dangerBtnConfirmStyle, opacity: isDeleting ? 0.6 : 1 }}
                    onClick={() => handleDelete(battle.id)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? '…' : 'Yes, Delete'}
                  </button>
                  <button
                    style={{ ...dangerBtnStyle, border: '1px solid var(--border-dim)', color: 'var(--text-muted)' }}
                    onClick={() => setConfirmId(null)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
