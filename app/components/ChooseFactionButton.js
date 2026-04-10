'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ChooseFactionButton({ campaignId, factions, currentFactionId }) {
  const supabase = createClient();

  const [open,     setOpen]     = useState(false);
  const [selected, setSelected] = useState('');
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState('');

  // Don't render at all once the user has a faction
  if (currentFactionId) return null;

  const selectedFaction = factions.find(f => f.id === selected) || null;

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
      setTimeout(() => window.location.reload(), 1200);
    }
  }

  // ── Collapsed: prompt button ─────────────────────────────────────────────
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

  // ── Expanded: dropdown + commit button appears once faction is picked ─────
  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      gap:            '0.6rem',
      flexWrap:       'wrap',
      background:     'rgba(183,140,64,0.06)',
      border:         '1px solid rgba(183,140,64,0.3)',
      padding:        '0.5rem 0.9rem',
    }}>

      {/* Dropdown */}
      <select
        value={selected}
        onChange={e => setSelected(e.target.value)}
        autoFocus
        style={{
          background:  'var(--surface-2)',
          border:      '1px solid var(--border-dim)',
          color:       selected ? 'var(--text-primary)' : 'var(--text-muted)',
          padding:     '0.4rem 0.7rem',
          fontSize:    '0.88rem',
          outline:     'none',
          cursor:      'pointer',
          minWidth:    '160px',
        }}
      >
        <option value="">— Choose your side —</option>
        {factions.map(f => (
          <option key={f.id} value={f.id}>{f.name}</option>
        ))}
      </select>

      {/* Commit button — only appears after a selection is made */}
      {selectedFaction && !saved && (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            padding:       '0.4rem 1rem',
            background:    'var(--accent)',
            color:         '#07070a',
            border:        '1px solid var(--accent)',
            fontFamily:    'var(--font-display)',
            fontSize:      '0.6rem',
            fontWeight:    '700',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            cursor:        saving ? 'default' : 'pointer',
            opacity:       saving ? 0.7 : 1,
            whiteSpace:    'nowrap',
          }}
        >
          {saving ? 'Joining…' : `Join ${selectedFaction.name} →`}
        </button>
      )}

      {/* Success */}
      {saved && (
        <span style={{ fontSize: '0.85rem', color: 'var(--accent)' }}>
          ✓ Joined!
        </span>
      )}

      {/* Cancel */}
      {!saved && (
        <button
          type="button"
          onClick={() => { setOpen(false); setSelected(''); setError(''); }}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', padding: '0 0.1rem', lineHeight: 1 }}
          title="Cancel"
        >
          ✕
        </button>
      )}

      {/* Error */}
      {error && (
        <span style={{ fontSize: '0.78rem', color: '#e05a5a', width: '100%' }}>
          ✗ {error}
        </span>
      )}
    </div>
  );
}
