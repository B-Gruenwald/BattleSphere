'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function MapEditForm({ territories, factions, campaignSlug }) {
  const supabase = createClient();

  // One local state object per territory: { name, description, type }
  const [rows, setRows] = useState(() =>
    Object.fromEntries(
      territories.map(t => [t.id, {
        name:        t.name        || '',
        description: t.description || '',
        type:        t.type        || '',
      }])
    )
  );

  // Track per-row saving / saved / error state
  const [saving,  setSaving]  = useState({});
  const [saved,   setSaved]   = useState({});
  const [errors,  setErrors]  = useState({});

  function update(id, field, value) {
    setRows(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    // Clear saved indicator on edit
    setSaved(prev => ({ ...prev, [id]: false }));
  }

  async function saveRow(id) {
    const row = rows[id];
    if (!row.name.trim()) {
      setErrors(prev => ({ ...prev, [id]: 'Name cannot be empty.' }));
      return;
    }
    setErrors(prev => ({ ...prev, [id]: '' }));
    setSaving(prev => ({ ...prev, [id]: true }));

    const { error } = await supabase
      .from('territories')
      .update({
        name:        row.name.trim(),
        description: row.description.trim() || null,
        type:        row.type.trim()        || null,
      })
      .eq('id', id);

    setSaving(prev => ({ ...prev, [id]: false }));
    if (error) {
      setErrors(prev => ({ ...prev, [id]: error.message }));
    } else {
      setSaved(prev => ({ ...prev, [id]: true }));
    }
  }

  const factionMap = Object.fromEntries((factions || []).map(f => [f.id, f]));

  // Build ordered list: roots alpha, each followed by their children alpha
  const roots    = territories.filter(t => !t.parent_id).sort((a, b) => a.name.localeCompare(b.name));
  const children = territories.filter(t =>  t.parent_id).sort((a, b) => a.name.localeCompare(b.name));
  const rootIds  = new Set(roots.map(r => r.id));
  const ordered  = roots.flatMap(r => [
    { ...r, isChild: false },
    ...children.filter(c => c.parent_id === r.id).map(c => ({ ...c, isChild: true })),
  ]);
  children.filter(c => !rootIds.has(c.parent_id)).forEach(c => ordered.push({ ...c, isChild: true }));

  const inputStyle = {
    width: '100%',
    background: 'var(--surface-2)',
    border: '1px solid var(--border-dim)',
    color: 'var(--text-primary)',
    padding: '0.5rem 0.75rem',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    fontFamily: 'var(--font-display)',
    fontSize: '0.52rem',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    marginBottom: '0.3rem',
  };

  return (
    <div>
      {ordered.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No territories yet. Add them from the campaign map.</p>
      ) : (
        ordered.map(t => {
          const row        = rows[t.id] || { name: '', description: '', type: '' };
          const controller = factionMap[t.controlling_faction_id];
          const isSaving   = saving[t.id];
          const isSaved    = saved[t.id];
          const rowError   = errors[t.id];

          return (
            <div
              key={t.id}
              style={{
                padding: '1.5rem',
                marginLeft: t.isChild ? '2rem' : '0',
                borderLeft: t.isChild ? '2px solid var(--border-dim)' : 'none',
                borderBottom: '1px solid var(--border-dim)',
                background: t.isChild ? 'rgba(255,255,255,0.01)' : 'transparent',
              }}
            >
              {/* Row header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {t.isChild && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>↳</span>
                )}
                <div style={{ width: '8px', height: '8px', background: controller?.colour || 'var(--border-dim)', transform: 'rotate(45deg)', flexShrink: 0 }} />
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.58rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: t.isChild ? 'var(--text-secondary)' : 'var(--text-gold)',
                }}>
                  {t.isChild ? 'Sub-territory' : 'Territory'}
                  {controller ? ` · ${controller.name}` : ' · Uncontrolled'}
                </span>
              </div>

              {/* Fields grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>

                {/* Name */}
                <div>
                  <label style={labelStyle}>Name *</label>
                  <input
                    type="text"
                    value={row.name}
                    onChange={e => update(t.id, 'name', e.target.value)}
                    style={inputStyle}
                    placeholder="Territory name"
                  />
                </div>

                {/* Type */}
                <div>
                  <label style={labelStyle}>Type</label>
                  <input
                    type="text"
                    value={row.type}
                    onChange={e => update(t.id, 'type', e.target.value)}
                    style={inputStyle}
                    placeholder="e.g. Hive City, Forge World, Wasteland…"
                  />
                </div>
              </div>

              {/* Description — full width */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Description</label>
                <textarea
                  value={row.description}
                  onChange={e => update(t.id, 'description', e.target.value)}
                  rows={2}
                  placeholder="A brief description of this territory…"
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                />
              </div>

              {/* Save row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => saveRow(t.id)}
                  disabled={isSaving}
                  className="btn-secondary"
                  style={{ opacity: isSaving ? 0.6 : 1, padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                >
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
                {isSaved && !isSaving && (
                  <span style={{ color: 'var(--text-gold)', fontSize: '0.8rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    ✓ Saved
                  </span>
                )}
                {rowError && (
                  <span style={{ color: '#e05a5a', fontSize: '0.8rem' }}>{rowError}</span>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
