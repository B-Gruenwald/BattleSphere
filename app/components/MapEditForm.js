'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Small inline form used for both Add Territory and Add Sub-territory ───────
function AddForm({ onAdd, onCancel, placeholder = 'Territory name' }) {
  const [name, setName]               = useState('');
  const [type, setType]               = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  async function submit() {
    if (!name.trim()) { setError('Name cannot be empty.'); return; }
    setSaving(true);
    setError('');
    const err = await onAdd({ name: name.trim(), type: type.trim() || null, description: description.trim() || null });
    if (err) { setError(err); setSaving(false); }
  }

  const inputStyle = {
    background: 'var(--surface-2)',
    border: '1px solid var(--border-dim)',
    color: 'var(--text-primary)',
    padding: '0.5rem 0.75rem',
    fontSize: '0.88rem',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%',
  };

  return (
    <div style={{ padding: '1.25rem 1.5rem', background: 'rgba(183,140,64,0.04)', border: '1px solid rgba(183,140,64,0.2)', marginBottom: '0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div>
          <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.5rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Name *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={placeholder} style={inputStyle} autoFocus />
        </div>
        <div>
          <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.5rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Type</label>
          <input type="text" value={type} onChange={e => setType(e.target.value)} placeholder="e.g. Hive City, Wasteland…" style={inputStyle} />
        </div>
      </div>
      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.5rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Brief description…" style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button type="button" className="btn-primary" onClick={submit} disabled={saving} style={{ opacity: saving ? 0.6 : 1, padding: '0.4rem 1.1rem', fontSize: '0.8rem' }}>
          {saving ? 'Adding…' : 'Add'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
          Cancel
        </button>
        {error && <span style={{ color: '#e05a5a', fontSize: '0.8rem' }}>{error}</span>}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function MapEditForm({ territories: initial, factions, campaignId }) {
  const supabase = createClient();

  const [items, setItems] = useState(initial);

  // Editable fields per territory id
  const [rows, setRows] = useState(() =>
    Object.fromEntries(initial.map(t => [t.id, { name: t.name || '', description: t.description || '', type: t.type || '' }]))
  );

  // Per-row UI state
  const [saving,  setSaving]  = useState({});
  const [saved,   setSaved]   = useState({});
  const [errors,  setErrors]  = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null); // territory id pending confirm
  const [deleting, setDeleting]           = useState({});

  // Which add-form is open: 'root' | { parentId } | null
  const [addingFor, setAddingFor] = useState(null);

  function update(id, field, value) {
    setRows(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    setSaved(prev => ({ ...prev, [id]: false }));
  }

  async function saveRow(id) {
    const row = rows[id];
    if (!row.name.trim()) { setErrors(prev => ({ ...prev, [id]: 'Name cannot be empty.' })); return; }
    setErrors(prev => ({ ...prev, [id]: '' }));
    setSaving(prev => ({ ...prev, [id]: true }));
    const { error } = await supabase.from('territories').update({
      name:        row.name.trim(),
      description: row.description.trim() || null,
      type:        row.type.trim()        || null,
    }).eq('id', id);
    setSaving(prev => ({ ...prev, [id]: false }));
    if (error) setErrors(prev => ({ ...prev, [id]: error.message }));
    else       setSaved(prev => ({ ...prev, [id]: true }));
  }

  async function addTerritory({ name, type, description }, parentId = null) {
    const parentItem = parentId ? items.find(t => t.id === parentId) : null;
    const depth = parentItem ? (parentItem.depth || 1) + 1 : 1;

    // ── Compute a sensible default position ──────────────────────────────────
    // Without x_pos/y_pos the node renders at (0,0) and disappears off-screen.
    // For root territories: place in a circle with existing roots (radius 28).
    // For sub-territories: orbit 9 units from the parent at the next open angle.
    let x_pos = 50;
    let y_pos = 46;

    if (!parentId) {
      // Root territory — place around the safe-zone centre in a circle
      const existingRoots = items.filter(t => !t.parent_id);
      const count  = existingRoots.length;
      const angle  = (count / Math.max(count + 1, 1)) * 2 * Math.PI - Math.PI / 2;
      x_pos = Math.round((50 + 28 * Math.cos(angle)) * 10) / 10;
      y_pos = Math.round((46 + 22 * Math.sin(angle)) * 10) / 10;
    } else if (parentItem && parentItem.x_pos != null && parentItem.y_pos != null) {
      // Sub-territory — orbit around the parent at the next open angle
      const siblings = items.filter(t => t.parent_id === parentId);
      const count    = siblings.length;
      const angle    = (count / Math.max(count + 1, 1)) * 2 * Math.PI - Math.PI / 2;
      x_pos = Math.round((parentItem.x_pos + 9 * Math.cos(angle)) * 10) / 10;
      y_pos = Math.round((parentItem.y_pos + 7 * Math.sin(angle)) * 10) / 10;
    }

    const { data, error } = await supabase
      .from('territories')
      .insert({ campaign_id: campaignId, name, type, description, parent_id: parentId || null, depth, x_pos, y_pos })
      .select()
      .single();
    if (error) return error.message;
    setItems(prev => [...prev, data]);
    setRows(prev => ({ ...prev, [data.id]: { name: data.name || '', description: data.description || '', type: data.type || '' } }));
    setAddingFor(null);
    return null; // no error
  }

  async function deleteTerritory(id) {
    setDeleting(prev => ({ ...prev, [id]: true }));

    // Detach any battles referencing this territory before deleting,
    // so battle records are preserved (shown as "Territory unknown").
    await supabase
      .from('battles')
      .update({ territory_id: null })
      .eq('territory_id', id);

    const { error } = await supabase.from('territories').delete().eq('id', id);
    setDeleting(prev => ({ ...prev, [id]: false }));
    if (error) {
      setErrors(prev => ({ ...prev, [id]: error.message }));
    } else {
      setItems(prev => prev.filter(t => t.id !== id));
      setConfirmDelete(null);
    }
  }

  const factionMap = Object.fromEntries((factions || []).map(f => [f.id, f]));

  // Build ordered display list from current items
  const roots    = items.filter(t => !t.parent_id).sort((a, b) => a.name.localeCompare(b.name));
  const children = items.filter(t =>  t.parent_id).sort((a, b) => a.name.localeCompare(b.name));
  const rootIds  = new Set(roots.map(r => r.id));
  const ordered  = roots.flatMap(r => [
    { ...r, isChild: false },
    ...children.filter(c => c.parent_id === r.id).map(c => ({ ...c, isChild: true })),
  ]);
  children.filter(c => !rootIds.has(c.parent_id)).forEach(c => ordered.push({ ...c, isChild: true }));

  // ── Styles ────────────────────────────────────────────────────────────────────
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
      {/* ── Add Territory button / form at top ────────────────────────────── */}
      <div style={{ marginBottom: '2rem' }}>
        {addingFor === 'root' ? (
          <AddForm
            placeholder="e.g. Ashenveil System"
            onAdd={fields => addTerritory(fields, null)}
            onCancel={() => setAddingFor(null)}
          />
        ) : (
          <button
            type="button"
            className="btn-primary"
            onClick={() => setAddingFor('root')}
            style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
          >
            + Add Territory
          </button>
        )}
      </div>

      {/* ── Territory rows ─────────────────────────────────────────────────── */}
      {ordered.length === 0 && addingFor !== 'root' && (
        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No territories yet. Add your first one above.</p>
      )}

      {ordered.map((t, idx) => {
        const row        = rows[t.id] || { name: '', description: '', type: '' };
        const controller = factionMap[t.controlling_faction_id];
        const isSaving   = saving[t.id];
        const isSaved    = saved[t.id];
        const rowError   = errors[t.id];
        const isConfirm  = confirmDelete === t.id;
        const isDeleting = deleting[t.id];
        const hasChildren = items.some(c => c.parent_id === t.id);

        // Show "Add Sub-territory" form after the LAST child of this root (or after the root itself if no children)
        const isRoot = !t.isChild;
        const nextItem = ordered[idx + 1];
        const showSubForm = isRoot && addingFor?.parentId === t.id &&
          (!nextItem || !nextItem.isChild || nextItem.parent_id !== t.id
            // show after last child of this root
            ? true
            : false);
        // Actually: show the sub-form after this root's last child. We render it at the ROOT row but only after all children are rendered.
        // Simpler: render the sub-form after the last child of this root (or after the root itself if no children).
        const isLastChildOfParent = t.isChild
          ? !ordered[idx + 1] || !ordered[idx + 1].isChild || ordered[idx + 1].parent_id !== t.parent_id
          : false;
        const showSubFormAfterChildren = isRoot && addingFor?.parentId === t.id && (!nextItem || !nextItem.isChild);
        const showSubFormAfterLastChild = t.isChild && isLastChildOfParent && addingFor?.parentId === t.parent_id;

        return (
          <div key={t.id}>
            <div
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
                {t.isChild && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>↳</span>}
                <div style={{ width: '8px', height: '8px', background: controller?.colour || 'var(--border-dim)', transform: 'rotate(45deg)', flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: t.isChild ? 'var(--text-secondary)' : 'var(--text-gold)', flex: 1 }}>
                  {t.isChild ? 'Sub-territory' : 'Territory'}
                  {controller ? ` · ${controller.name}` : ' · Uncontrolled'}
                </span>
                {/* Delete controls — top-right of header */}
                {isConfirm ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    {hasChildren ? (
                      <>
                        <span style={{ fontSize: '0.78rem', color: '#e05a5a' }}>Delete sub-territories first</span>
                        <button type="button" onClick={() => setConfirmDelete(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: '0.78rem', color: '#e05a5a' }}>Delete "{row.name}"?</span>
                        <button
                          type="button"
                          onClick={() => deleteTerritory(t.id)}
                          disabled={isDeleting}
                          style={{ background: 'rgba(224,90,90,0.15)', border: '1px solid #e05a5a', color: '#e05a5a', padding: '0.25rem 0.65rem', fontSize: '0.75rem', cursor: 'pointer', opacity: isDeleting ? 0.6 : 1 }}
                        >
                          {isDeleting ? '…' : 'Yes, delete'}
                        </button>
                        <button type="button" onClick={() => setConfirmDelete(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                      </>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(t.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.78rem', flexShrink: 0, padding: '0 0.25rem' }}
                    title="Delete territory"
                  >
                    Delete
                  </button>
                )}
              </div>

              {/* Fields grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Name *</label>
                  <input type="text" value={row.name} onChange={e => update(t.id, 'name', e.target.value)} style={inputStyle} placeholder="Territory name" />
                </div>
                <div>
                  <label style={labelStyle}>Type</label>
                  <input type="text" value={row.type} onChange={e => update(t.id, 'type', e.target.value)} style={inputStyle} placeholder="e.g. Hive City, Forge World, Wasteland…" />
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Description</label>
                <textarea value={row.description} onChange={e => update(t.id, 'description', e.target.value)} rows={2} placeholder="A brief description of this territory…" style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
              </div>

              {/* Row actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => saveRow(t.id)} disabled={isSaving} className="btn-secondary" style={{ opacity: isSaving ? 0.6 : 1, padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
                {isSaved && !isSaving && (
                  <span style={{ color: 'var(--text-gold)', fontSize: '0.8rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>✓ Saved</span>
                )}
                {rowError && <span style={{ color: '#e05a5a', fontSize: '0.8rem' }}>{rowError}</span>}

                {/* "＋ Sub-territory" only on root rows */}
                {isRoot && addingFor?.parentId !== t.id && (
                  <button
                    type="button"
                    onClick={() => setAddingFor({ parentId: t.id })}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.78rem', marginLeft: 'auto', padding: '0' }}
                  >
                    + Sub-territory
                  </button>
                )}
              </div>
            </div>

            {/* Inline add-sub-territory form: shown after root (no children) or after root's last child */}
            {(showSubFormAfterChildren || showSubFormAfterLastChild) && (
              <div style={{ marginLeft: '2rem', borderLeft: '2px solid rgba(183,140,64,0.3)' }}>
                <AddForm
                  placeholder="e.g. Ashenveil Shrine World"
                  onAdd={fields => addTerritory(fields, t.isChild ? t.parent_id : t.id)}
                  onCancel={() => setAddingFor(null)}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
