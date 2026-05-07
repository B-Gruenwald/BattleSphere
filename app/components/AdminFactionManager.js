'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AdminFactionManager({ factions: initialFactions, campaignId }) {
  const supabase = createClient();

  const [factions,   setFactions]   = useState(initialFactions || []);
  const [edits,      setEdits]      = useState(() =>
    Object.fromEntries((initialFactions || []).map(f => [f.id, { name: f.name || '', colour: f.colour || '#b78c40' }]))
  );
  const [saving,     setSaving]     = useState({});
  const [saved,      setSaved]      = useState({});
  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting,   setDeleting]   = useState(null);
  const [rowError,   setRowError]   = useState({});

  // Add-faction state
  const [newName,    setNewName]    = useState('');
  const [newColour,  setNewColour]  = useState('#b78c40');
  const [adding,     setAdding]     = useState(false);
  const [addError,   setAddError]   = useState('');

  function setEdit(id, field, value) {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    setSaved(prev => ({ ...prev, [id]: false }));
  }

  async function saveRow(id) {
    const row = edits[id];
    if (!row?.name.trim()) {
      setRowError(prev => ({ ...prev, [id]: 'Name cannot be empty.' }));
      return;
    }
    setRowError(prev => ({ ...prev, [id]: '' }));
    setSaving(prev => ({ ...prev, [id]: true }));
    const { error } = await supabase.from('factions').update({ name: row.name.trim(), colour: row.colour }).eq('id', id);
    setSaving(prev => ({ ...prev, [id]: false }));
    if (error) {
      setRowError(prev => ({ ...prev, [id]: error.message }));
    } else {
      setFactions(prev => prev.map(f => f.id === id ? { ...f, name: row.name.trim(), colour: row.colour } : f));
      setSaved(prev => ({ ...prev, [id]: true }));
      setTimeout(() => setSaved(prev => ({ ...prev, [id]: false })), 2500);
    }
  }

  async function deleteFaction(id) {
    setDeleting(id);
    const { error } = await supabase.from('factions').delete().eq('id', id);
    setDeleting(null);
    if (error) {
      setRowError(prev => ({ ...prev, [id]: error.message }));
    } else {
      setFactions(prev => prev.filter(f => f.id !== id));
      setEdits(prev => { const next = { ...prev }; delete next[id]; return next; });
      setConfirmDel(null);
    }
  }

  async function addFaction() {
    if (!newName.trim()) { setAddError('Name cannot be empty.'); return; }
    setAdding(true);
    setAddError('');
    const { data, error } = await supabase
      .from('factions')
      .insert({ campaign_id: campaignId, name: newName.trim(), colour: newColour })
      .select()
      .single();
    setAdding(false);
    if (error) {
      setAddError(error.message);
    } else {
      setFactions(prev => [...prev, data]);
      setEdits(prev => ({ ...prev, [data.id]: { name: data.name, colour: data.colour } }));
      setNewName('');
      setNewColour('#b78c40');
    }
  }

  const inputStyle = {
    background: 'var(--surface-2)',
    border: '1px solid var(--border-dim)',
    color: 'var(--text-primary)',
    padding: '0.45rem 0.65rem',
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const colourPickerStyle = {
    width: '38px',
    height: '34px',
    border: '1px solid var(--border-dim)',
    background: 'none',
    cursor: 'pointer',
    padding: '2px',
    flexShrink: 0,
  };

  return (
    <div style={{ border: '1px solid var(--border-dim)' }}>

      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '38px 1fr auto auto',
        gap: '0.5rem',
        padding: '0.5rem 0.75rem',
        borderBottom: '1px solid var(--border-dim)',
        background: 'rgba(255,255,255,0.02)',
      }}>
        {['Colour', 'Name', '', ''].map((h, i) => (
          <span key={i} style={{
            fontFamily: 'var(--font-display)', fontSize: '0.5rem',
            letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)',
            alignSelf: 'center',
          }}>{h}</span>
        ))}
      </div>

      {/* Existing faction rows */}
      {factions.length === 0 && (
        <div style={{ padding: '1.25rem 0.75rem' }}>
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem', margin: 0 }}>
            No factions yet. Add one below.
          </p>
        </div>
      )}

      {factions.map(faction => {
        const row       = edits[faction.id] || { name: faction.name, colour: faction.colour };
        const isDirty   = row.name !== faction.name || row.colour !== faction.colour;
        const isSaving  = saving[faction.id];
        const isSaved   = saved[faction.id];
        const isConfirm = confirmDel === faction.id;
        const isDeleting = deleting === faction.id;
        const err       = rowError[faction.id];

        return (
          <div key={faction.id}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '38px 1fr auto auto',
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              borderBottom: '1px solid var(--border-dim)',
              alignItems: 'center',
            }}>
              {/* Colour */}
              <input
                type="color"
                value={row.colour}
                onChange={e => setEdit(faction.id, 'colour', e.target.value)}
                style={colourPickerStyle}
                title="Pick faction colour"
              />

              {/* Name */}
              <input
                type="text"
                value={row.name}
                onChange={e => setEdit(faction.id, 'name', e.target.value)}
                style={{ ...inputStyle, width: '100%' }}
                placeholder="Faction name"
                onKeyDown={e => e.key === 'Enter' && isDirty && saveRow(faction.id)}
              />

              {/* Save / saved feedback */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-end' }}>
                {isSaved && (
                  <span style={{ color: 'var(--text-gold)', fontSize: '0.72rem', fontFamily: 'var(--font-display)', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                    ✓
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => saveRow(faction.id)}
                  disabled={isSaving || !isDirty}
                  style={{
                    padding: '0.3rem 0.75rem', fontSize: '0.72rem',
                    background: 'transparent',
                    border: `1px solid ${isDirty ? 'var(--gold)' : 'var(--border-dim)'}`,
                    color: isDirty ? 'var(--text-gold)' : 'var(--text-muted)',
                    cursor: (isSaving || !isDirty) ? 'not-allowed' : 'pointer',
                    opacity: (isSaving || !isDirty) ? 0.5 : 1,
                    whiteSpace: 'nowrap',
                    fontFamily: 'var(--font-display)', letterSpacing: '0.08em',
                  }}
                >
                  {isSaving ? '…' : 'Save'}
                </button>
              </div>

              {/* Delete / confirm */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'flex-end' }}>
                {!isConfirm ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDel(faction.id)}
                    style={{
                      padding: '0.3rem 0.6rem', fontSize: '0.68rem',
                      background: 'transparent', border: '1px solid var(--border-dim)',
                      color: 'var(--text-muted)', cursor: 'pointer',
                      fontFamily: 'var(--font-display)', letterSpacing: '0.08em',
                    }}
                  >
                    ✕
                  </button>
                ) : (
                  <>
                    <span style={{ fontSize: '0.72rem', color: '#e05a5a', whiteSpace: 'nowrap' }}>Sure?</span>
                    <button
                      type="button"
                      onClick={() => deleteFaction(faction.id)}
                      disabled={isDeleting}
                      style={{
                        padding: '0.3rem 0.6rem', fontSize: '0.68rem',
                        background: 'rgba(224,90,90,0.12)', border: '1px solid #e05a5a',
                        color: '#e05a5a', cursor: isDeleting ? 'not-allowed' : 'pointer',
                        opacity: isDeleting ? 0.6 : 1,
                        fontFamily: 'var(--font-display)', letterSpacing: '0.08em',
                      }}
                    >
                      {isDeleting ? '…' : 'Yes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDel(null)}
                      style={{
                        padding: '0.3rem 0.5rem', fontSize: '0.68rem',
                        background: 'transparent', border: 'none',
                        color: 'var(--text-muted)', cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            </div>

            {err && (
              <p style={{ margin: '0 0.75rem 0.4rem', color: '#e05a5a', fontSize: '0.78rem' }}>{err}</p>
            )}
          </div>
        );
      })}

      {/* Add new faction row */}
      <div style={{ padding: '0.6rem 0.75rem', background: 'rgba(183,140,64,0.03)', borderTop: factions.length > 0 ? '1px solid var(--border-dim)' : 'none' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '38px 1fr auto',
          gap: '0.5rem',
          alignItems: 'center',
        }}>
          <input
            type="color"
            value={newColour}
            onChange={e => setNewColour(e.target.value)}
            style={colourPickerStyle}
            title="Pick colour for new faction"
          />
          <input
            type="text"
            value={newName}
            onChange={e => { setNewName(e.target.value); setAddError(''); }}
            placeholder="New faction name…"
            style={{ ...inputStyle, width: '100%' }}
            onKeyDown={e => e.key === 'Enter' && !adding && addFaction()}
          />
          <button
            type="button"
            onClick={addFaction}
            disabled={adding || !newName.trim()}
            style={{
              padding: '0.3rem 0.85rem', fontSize: '0.72rem',
              background: newName.trim() ? 'rgba(183,140,64,0.1)' : 'transparent',
              border: `1px solid ${newName.trim() ? 'var(--gold)' : 'var(--border-dim)'}`,
              color: newName.trim() ? 'var(--text-gold)' : 'var(--text-muted)',
              cursor: (adding || !newName.trim()) ? 'not-allowed' : 'pointer',
              opacity: (adding || !newName.trim()) ? 0.5 : 1,
              whiteSpace: 'nowrap',
              fontFamily: 'var(--font-display)', letterSpacing: '0.08em',
            }}
          >
            {adding ? '…' : '+ Add'}
          </button>
        </div>
        {addError && (
          <p style={{ margin: '0.35rem 0 0', color: '#e05a5a', fontSize: '0.78rem' }}>{addError}</p>
        )}
      </div>

    </div>
  );
}
