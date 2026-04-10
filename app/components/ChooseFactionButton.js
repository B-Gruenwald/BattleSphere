'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ChooseFactionButton({ campaignId, factions, currentFactionId }) {
  const supabase = createClient();

  const [open,     setOpen]     = useState(false);
  const [selected, setSelected] = useState(currentFactionId || '');
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState('');

  // Don't render at all if user already has a faction
  if (currentFactionId) return null;

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setError('');
    const { data: { user } } = await supabase.auth.getUser();
    const { data: savedRows, error: err } = await supabase
      .from('campaign_members')
      .update({ faction_id: selected })
      .eq('campaign_id', campaignId)
      .eq('user_id', user?.id)
      .select();
    setSaving(false);
    if (err) {
      setError(err.message);
    } else if (!savedRows || savedRows.length === 0) {
      setError('Could not save — try refreshing the page.');
    } else {
      setSaved(true);
      // Brief confirmation, then remove the button entirely
      setTimeout(() => window.location.reload(), 1200);
    }
  }

  // ── Collapsed state: gold prompt button ──────────────────────────────────
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          padding:       '0.5rem 1.25rem',
          background:    'rgba(183,140,64,0.08)',
          color:         'var(--accent)',
          border:        '1px solid rgba(183,140,64,0.5)',
          fontFamily:    'var(--font-display)',
          fontSize:      '0.6rem',
          fontWeight:    '700',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          cursor:        'pointer',
          whiteSpace:    'nowrap',
        }}
      >
        ⚔ Choose Your Faction
      </button>
    );
  }

  // ── Expanded state: inline faction picker ────────────────────────────────
  return (
    <div style={{
      display:    'flex',
      alignItems: 'center',
      gap:        '0.6rem',
      flexWrap:   'wrap',
      background: 'rgba(183,140,64,0.06)',
      border:     '1px solid rgba(183,140,64,0.3)',
      padding:    '0.5rem 0.9rem',
    }}>
      <span style={{
        fontFamily:    'var(--font-display)',
        fontSize:      '0.56rem',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color:         'var(--accent)',
        whiteSpace:    'nowrap',
      }}>
        Your Faction:
      </span>

      <select
        value={selected}
        onChange={e => { setSelected(e.target.value); setSaved(false); }}
        style={{
          background:   'var(--surface-2)',
          border:       '1px solid var(--border-dim)',
          color:        'var(--text-primary)',
          padding:      '0.35rem 0.65rem',
          fontSize:     '0.88rem',
          outline:      'none',
          appearance:   'none',
          cursor:       'pointer',
          minWidth:     '140px',
        }}
      >
        <option value="">— Select —</option>
        {factions.map(f => (
          <option key={f.id} value={f.id}>{f.name}</option>
        ))}
      </select>

      {saved ? (
        <span style={{ fontSize: '0.82rem', color: 'var(--accent)', fontStyle: 'italic' }}>
          ✓ Joined!
        </span>
      ) : (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !selected}
          style={{
            padding:       '0.35rem 0.9rem',
            background:    'var(--accent)',
            color:         '#07070a',
            border:        '1px solid var(--accent)',
            fontFamily:    'var(--font-display)',
            fontSize:      '0.56rem',
            fontWeight:    '700',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            cursor:        saving || !selected ? 'default' : 'pointer',
            opacity:       saving || !selected ? 0.6 : 1,
            whiteSpace:    'nowrap',
          }}
        >
          {saving ? 'Saving…' : 'Confirm'}
        </button>
      )}

      {!saved && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem', padding: '0 0.1rem', lineHeight: 1 }}
          title="Cancel"
        >
          ✕
        </button>
      )}

      {error && (
        <span style={{ fontSize: '0.78rem', color: '#e05a5a', width: '100%' }}>{error}</span>
      )}
    </div>
  );
}
