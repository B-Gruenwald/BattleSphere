'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AdminFactionEditor({ factions: initialFactions, campaignId }) {
  const supabase = createClient();

  // Per-faction edit state: { [id]: { name, colour } }
  const [rows, setRows] = useState(() =>
    Object.fromEntries(initialFactions.map(f => [f.id, { name: f.name || '', colour: f.colour || '#b78c40' }]))
  );

  const [saving,  setSaving]  = useState({});
  const [saved,   setSaved]   = useState({});
  const [errors,  setErrors]  = useState({});

  function update(id, field, value) {
    setRows(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    setSaved(prev => ({ ...prev, [id]: false }));
  }

  async function saveRow(faction) {
    const row = rows[faction.id];
    if (!row.name.trim()) {
      setErrors(prev => ({ ...prev, [faction.id]: 'Name cannot be empty.' }));
      return;
    }
    setErrors(prev => ({ ...prev, [faction.id]: '' }));
    setSaving(prev => ({ ...prev, [faction.id]: true }));

    const { error } = await supabase
      .from('factions')
      .update({ name: row.name.trim(), colour: row.colour })
      .eq('id', faction.id);

    setSaving(prev => ({ ...prev, [faction.id]: false }));
    if (error) {
      setErrors(prev => ({ ...prev, [faction.id]: error.message }));
    } else {
      setSaved(prev => ({ ...prev, [faction.id]: true }));
    }
  }

  const inputStyle = {
    background: 'var(--surface-2)',
    border: '1px solid var(--border-dim)',
    color: 'var(--text-primary)',
    padding: '0.55rem 0.75rem',
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    fontFamily: 'var(--font-display)',
    fontSize: '0.5rem',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    marginBottom: '0.3rem',
  };

  if (initialFactions.length === 0) {
    return (
      <div style={{ border: '1px solid var(--border-dim)', padding: '2rem' }}>
        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>No factions in this campaign.</p>
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid var(--border-dim)' }}>
      {initialFactions.map((faction, i) => {
        const row = rows[faction.id] || { name: '', colour: '#b78c40' };
        const isSaving = saving[faction.id];
        const isSaved  = saved[faction.id];
        const rowError = errors[faction.id];
        const isDirty  = row.name !== faction.name || row.colour !== faction.colour;

        return (
          <div
            key={faction.id}
            style={{
              padding: '1.5rem 1.75rem',
              borderBottom: i < initialFactions.length - 1 ? '1px solid var(--border-dim)' : 'none',
            }}
          >
            {/* Faction header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <div style={{ width: '10px', height: '10px', background: row.colour, transform: 'rotate(45deg)', flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Faction {i + 1}
              </span>
            </div>

            {/* Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'end', marginBottom: '1rem' }}>
              {/* Name */}
              <div>
                <label style={labelStyle}>Name *</label>
                <input
                  type="text"
                  value={row.name}
                  onChange={e => update(faction.id, 'name', e.target.value)}
                  style={{ ...inputStyle, width: '100%' }}
                  placeholder="Faction name"
                />
              </div>

              {/* Colour picker */}
              <div>
                <label style={labelStyle}>Colour</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <input
                    type="color"
                    value={row.colour}
                    onChange={e => update(faction.id, 'colour', e.target.value)}
                    style={{
                      width: '42px',
                      height: '38px',
                      border: '1px solid var(--border-dim)',
                      background: 'none',
                      cursor: 'pointer',
                      padding: '2px',
                    }}
                    title="Pick faction colour"
                  />
                  <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {row.colour}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => saveRow(faction)}
                disabled={isSaving || !isDirty}
                style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', opacity: (isSaving || !isDirty) ? 0.5 : 1 }}
              >
                {isSaving ? 'Saving…' : 'Save'}
              </button>
              {isSaved && !isSaving && (
                <span style={{ color: 'var(--text-gold)', fontSize: '0.78rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  ✓ Saved
                </span>
              )}
              {rowError && (
                <span style={{ color: '#e05a5a', fontSize: '0.8rem' }}>{rowError}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
