'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PhotoGallery from '@/app/components/PhotoGallery';

// ── Styles ──────────────────────────────────────────────────
const inputStyle = {
  width: '100%', background: 'var(--bg-raised)',
  border: '1px solid var(--border-dim)', color: 'var(--text-primary)',
  padding: '0.65rem 0.85rem', fontSize: '1rem',
  outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box',
};
const textareaStyle = {
  ...inputStyle,
  resize: 'vertical', minHeight: '120px', lineHeight: 1.7,
};
const labelStyle = {
  display: 'block',
  fontFamily: 'var(--font-display)', fontSize: '0.58rem',
  letterSpacing: '0.14em', textTransform: 'uppercase',
  color: 'var(--text-gold)', marginBottom: '0.5rem',
};
const sectionStyle = {
  border: '1px solid var(--border-dim)', padding: '1.1rem 1.25rem', marginBottom: '1rem',
};
const sectionHeadingStyle = {
  fontFamily: 'var(--font-display)', fontSize: '0.6rem',
  letterSpacing: '0.14em', textTransform: 'uppercase',
  color: 'var(--text-gold)', marginBottom: '1rem',
};

// ── Unit card ────────────────────────────────────────────────
function UnitCard({ unit: initialUnit, userId, onDelete, onMoveUp, onMoveDown, isReordering }) {
  const [unit,       setUnit]       = useState(initialUnit);
  const [dirty,      setDirty]      = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [error,      setError]      = useState(null);

  function handleChange(e) {
    setUnit(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/army-units/${unit.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:        unit.name,
          unit_type:   unit.unit_type,
          description: unit.description,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setUnit(prev => ({ ...prev, ...data.unit }));
      setDirty(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${unit.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/army-units/${unit.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Delete failed');
      }
      onDelete(unit.id);
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  return (
    <div style={{ border: '1px solid var(--border-dim)', padding: '1rem 1.1rem', opacity: deleting ? 0.4 : 1 }}>

      {/* Reorder + unit label row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.52rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          {unit.name || 'Unit'}
        </span>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button
            onClick={onMoveUp}
            disabled={!onMoveUp || saving || deleting || isReordering}
            title="Move up"
            style={{
              background: 'none',
              border: '1px solid var(--border-dim)',
              color: onMoveUp ? 'var(--text-secondary)' : 'var(--border-dim)',
              cursor: onMoveUp ? 'pointer' : 'default',
              padding: '0.15rem 0.45rem',
              fontSize: '0.75rem',
              fontFamily: 'inherit',
              lineHeight: 1,
              opacity: (!onMoveUp || isReordering) ? 0.35 : 1,
              transition: 'opacity 0.15s',
            }}
          >↑</button>
          <button
            onClick={onMoveDown}
            disabled={!onMoveDown || saving || deleting || isReordering}
            title="Move down"
            style={{
              background: 'none',
              border: '1px solid var(--border-dim)',
              color: onMoveDown ? 'var(--text-secondary)' : 'var(--border-dim)',
              cursor: onMoveDown ? 'pointer' : 'default',
              padding: '0.15rem 0.45rem',
              fontSize: '0.75rem',
              fontFamily: 'inherit',
              lineHeight: 1,
              opacity: (!onMoveDown || isReordering) ? 0.35 : 1,
              transition: 'opacity 0.15s',
            }}
          >↓</button>
        </div>
      </div>

      {/* Unit meta fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div>
          <label style={labelStyle}>Unit Name</label>
          <input
            name="name"
            value={unit.name || ''}
            onChange={handleChange}
            style={inputStyle}
            disabled={saving || deleting}
            placeholder="e.g. Brother-Sergeant Kha'leth"
          />
        </div>
        <div>
          <label style={labelStyle}>Unit Type</label>
          <input
            name="unit_type"
            value={unit.unit_type || ''}
            onChange={handleChange}
            style={inputStyle}
            disabled={saving || deleting}
            placeholder="e.g. Intercessor Squad"
          />
        </div>
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <label style={labelStyle}>Description / Fluff</label>
        <textarea
          name="description"
          value={unit.description || ''}
          onChange={handleChange}
          style={{ ...textareaStyle, minHeight: '60px' }}
          disabled={saving || deleting}
          placeholder="Background, distinguishing features, battle history…"
        />
      </div>

      {error && (
        <p style={{ color: '#e05a5a', fontSize: '0.82rem', marginBottom: '0.5rem' }}>{error}</p>
      )}

      {/* Save / Delete row */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
        {dirty && (
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving || deleting}
            style={{ fontSize: '0.82rem' }}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={saving || deleting}
          style={{
            background: 'none', border: '1px solid rgba(224,90,90,0.4)',
            color: '#e05a5a', cursor: 'pointer', padding: '0.35rem 0.8rem',
            fontSize: '0.78rem', fontFamily: 'inherit',
            opacity: deleting ? 0.5 : 1,
          }}
        >
          {deleting ? 'Deleting…' : 'Delete Unit'}
        </button>
      </div>

      {/* Photos for this unit */}
      <PhotoGallery
        photos={unit.photos || []}
        entityType="army-unit"
        entityId={unit.id}
        userId={userId}
        canUpload={true}
        canManage={true}
      />
    </div>
  );
}

// ── Add Unit form ────────────────────────────────────────────
function AddUnitForm({ armyId, onAdd, onCancel }) {
  const [form,    setForm]    = useState({ name: '', unit_type: '', description: '' });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Unit name is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      const res  = await fetch('/api/army-units', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ armyId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add unit');
      onAdd({ ...data.unit, photos: [] });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ border: '1px solid rgba(183,140,64,0.3)', padding: '1rem 1.1rem', background: 'rgba(183,140,64,0.02)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div>
          <label style={labelStyle}>Unit Name *</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            style={inputStyle}
            disabled={saving}
            placeholder="e.g. Intercessor Squad Alpha"
            autoFocus
          />
        </div>
        <div>
          <label style={labelStyle}>Unit Type</label>
          <input
            name="unit_type"
            value={form.unit_type}
            onChange={handleChange}
            style={inputStyle}
            disabled={saving}
            placeholder="e.g. Infantry"
          />
        </div>
      </div>
      <div style={{ marginBottom: '0.75rem' }}>
        <label style={labelStyle}>Description</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          style={{ ...textareaStyle, minHeight: '55px' }}
          disabled={saving}
          placeholder="Optional background or fluff…"
        />
      </div>
      {error && <p style={{ color: '#e05a5a', fontSize: '0.82rem', marginBottom: '0.5rem' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button type="submit" className="btn-primary" disabled={saving} style={{ fontSize: '0.8rem' }}>
          {saving ? 'Adding…' : 'Add Unit'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving} style={{ fontSize: '0.8rem' }}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Cover image uploader ─────────────────────────────────────
function CoverUpload({ currentUrl, cloudName, onUpload, disabled }) {
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState(null);
  const inputRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) { setError('JPG, PNG, WebP or GIF only.'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('Max 10 MB.'); return; }

    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', 'battlesphere_unsigned');
      const res  = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.secure_url) throw new Error(data.error?.message || 'Upload failed');
      onUpload(data.secure_url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      {currentUrl && (
        <div style={{ width: '100%', aspectRatio: '21/9', overflow: 'hidden', marginBottom: '0.75rem', border: '1px solid var(--border-dim)' }}>
          <img src={currentUrl} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
      {error && <p style={{ color: '#e05a5a', fontSize: '0.82rem', marginBottom: '0.5rem' }}>{error}</p>}
      <label style={{ cursor: disabled || uploading ? 'not-allowed' : 'pointer', opacity: disabled || uploading ? 0.6 : 1 }}>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }} onChange={handleFile} disabled={disabled || uploading} />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-gold)', cursor: 'inherit' }}>
          {uploading ? 'Uploading…' : currentUrl ? '↑ Replace Cover Image' : '+ Upload Cover Image'}
        </span>
      </label>
      {currentUrl && (
        <button
          onClick={() => onUpload(null)}
          style={{ marginLeft: '1.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit' }}
          disabled={disabled || uploading}
        >
          Remove
        </button>
      )}
    </div>
  );
}

// ── Main edit component ──────────────────────────────────────
export default function ArmyEditClient({ army: initialArmy, initialUnits, userId }) {
  const router = useRouter();
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  const [form, setForm] = useState({
    name:            initialArmy.name            || '',
    game_system:     initialArmy.game_system      || '',
    faction_name:    initialArmy.faction_name     || '',
    tagline:         initialArmy.tagline          || '',
    backstory:       initialArmy.backstory        || '',
    cover_image_url: initialArmy.cover_image_url  || '',
  });
  const [formDirty,    setFormDirty]    = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [saveOk,       setSaveOk]       = useState(false);
  const [deleteArmy,   setDeleteArmy]   = useState(false);
  const [formError,    setFormError]    = useState(null);

  const [units,        setUnits]        = useState(initialUnits || []);
  const [showAddUnit,  setShowAddUnit]  = useState(false);
  const [reordering,   setReordering]   = useState(false);

  function handleFormChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setFormDirty(true);
    setSaveOk(false);
  }

  function handleCoverUpload(url) {
    setForm(prev => ({ ...prev, cover_image_url: url || '' }));
    setFormDirty(true);
    setSaveOk(false);
  }

  async function handleSaveArmy(e) {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Army name is required.'); return; }
    setSaving(true);
    setFormError(null);
    setSaveOk(false);
    try {
      const res = await fetch(`/api/armies/${initialArmy.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setFormDirty(false);
      setSaveOk(true);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteArmy() {
    if (!window.confirm(`Permanently delete "${initialArmy.name}" and all its units and photos? This cannot be undone.`)) return;
    setDeleteArmy(true);
    try {
      const res = await fetch(`/api/armies/${initialArmy.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Delete failed');
      }
      router.push('/dashboard');
    } catch (err) {
      setFormError(err.message);
      setDeleteArmy(false);
    }
  }

  function handleUnitAdded(unit) {
    setUnits(prev => [...prev, unit]);
    setShowAddUnit(false);
  }

  function handleUnitDeleted(unitId) {
    setUnits(prev => prev.filter(u => u.id !== unitId));
  }

  async function moveUnit(index, dir) {
    const swap = dir === 'up' ? index - 1 : index + 1;
    if (swap < 0 || swap >= units.length) return;

    // Optimistic reorder
    const next = [...units];
    [next[index], next[swap]] = [next[swap], next[index]];
    setUnits(next);

    // Persist to DB
    setReordering(true);
    try {
      await fetch('/api/army-units/reorder', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ armyId: initialArmy.id, ids: next.map(u => u.id) }),
      });
    } finally {
      setReordering(false);
    }
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '860px', margin: '0 auto' }}>

      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <Link href="/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.75rem' }}>Dashboard</Link>
        <span style={{ color: 'var(--border-dim)', fontSize: '0.75rem' }}>›</span>
        <Link href={`/armies/${initialArmy.id}`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.75rem' }}>{initialArmy.name}</Link>
        <span style={{ color: 'var(--border-dim)', fontSize: '0.75rem' }}>›</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Edit</span>
      </nav>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: 'clamp(1.1rem, 3vw, 1.5rem)', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Edit Army
        </h1>
        <Link href={`/armies/${initialArmy.id}`} style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textDecoration: 'none' }}>
          View public page →
        </Link>
      </div>

      {/* ── Army Details ─────────────────────────────────────── */}
      <form onSubmit={handleSaveArmy}>
        <div style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>Army Details</h2>

          {formError && (
            <div style={{ background: 'rgba(224,90,90,0.08)', border: '1px solid rgba(224,90,90,0.3)', padding: '0.75rem 1rem', marginBottom: '1.5rem', color: '#e05a5a', fontSize: '0.88rem' }}>
              {formError}
            </div>
          )}
          {saveOk && (
            <div style={{ background: 'rgba(80,200,120,0.08)', border: '1px solid rgba(80,200,120,0.3)', padding: '0.75rem 1rem', marginBottom: '1.5rem', color: '#50c878', fontSize: '0.88rem' }}>
              Army saved.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>

            <div>
              <label style={labelStyle}>Army Name *</label>
              <input
                name="name"
                value={form.name}
                onChange={handleFormChange}
                style={inputStyle}
                disabled={saving || deleteArmy}
                placeholder="e.g. Iron Hands 4th Demi-Company"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Game System</label>
                <input
                  name="game_system"
                  value={form.game_system}
                  onChange={handleFormChange}
                  style={inputStyle}
                  disabled={saving || deleteArmy}
                  placeholder="e.g. Warhammer 40K"
                />
              </div>
              <div>
                <label style={labelStyle}>Faction</label>
                <input
                  name="faction_name"
                  value={form.faction_name}
                  onChange={handleFormChange}
                  style={inputStyle}
                  disabled={saving || deleteArmy}
                  placeholder="e.g. Space Marines"
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Tagline</label>
              <input
                name="tagline"
                value={form.tagline}
                onChange={handleFormChange}
                style={inputStyle}
                disabled={saving || deleteArmy}
                placeholder="One punchy sentence about this army"
              />
            </div>

            <div>
              <label style={labelStyle}>Backstory</label>
              <textarea
                name="backstory"
                value={form.backstory}
                onChange={handleFormChange}
                style={textareaStyle}
                disabled={saving || deleteArmy}
                placeholder="The full origin story, campaign history, notable engagements…"
              />
            </div>

            <div>
              <label style={labelStyle}>Cover Image</label>
              <CoverUpload
                currentUrl={form.cover_image_url}
                cloudName={cloudName}
                onUpload={handleCoverUpload}
                disabled={saving || deleteArmy}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving || deleteArmy || !formDirty}
            >
              {saving ? 'Saving…' : 'Save Army Details'}
            </button>
          </div>
        </div>
      </form>

      {/* ── Unit Roster ──────────────────────────────────────── */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
          <h2 style={{ ...sectionHeadingStyle, marginBottom: 0 }}>
            Unit Roster — {units.length} {units.length === 1 ? 'unit' : 'units'}
          </h2>
          {!showAddUnit && (
            <button
              className="btn-secondary"
              onClick={() => setShowAddUnit(true)}
              style={{ fontSize: '0.8rem' }}
            >
              + Add Unit
            </button>
          )}
        </div>

        {/* Add unit form */}
        {showAddUnit && (
          <div style={{ marginBottom: '0.75rem' }}>
            <AddUnitForm
              armyId={initialArmy.id}
              onAdd={handleUnitAdded}
              onCancel={() => setShowAddUnit(false)}
            />
          </div>
        )}

        {/* Existing units */}
        {units.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {units.map((unit, idx) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                userId={userId}
                onDelete={handleUnitDeleted}
                onMoveUp={idx > 0 ? () => moveUnit(idx, 'up') : null}
                onMoveDown={idx < units.length - 1 ? () => moveUnit(idx, 'down') : null}
                isReordering={reordering}
              />
            ))}
          </div>
        ) : (
          !showAddUnit && (
            <div style={{ textAlign: 'center', padding: '1.25rem 0', borderTop: '1px solid var(--border-dim)' }}>
              <div style={{ width: '6px', height: '6px', background: 'var(--gold)', transform: 'rotate(45deg)', margin: '0 auto 1rem', opacity: 0.4 }} />
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                No units yet — click "+ Add Unit" to start building your roster.
              </p>
            </div>
          )
        )}
      </div>

      {/* ── Danger zone ──────────────────────────────────────── */}
      <div style={{ border: '1px solid rgba(224,90,90,0.2)', padding: '1rem 1.25rem' }}>
        <h2 style={{ ...sectionHeadingStyle, color: '#e05a5a', marginBottom: '0.5rem' }}>Danger Zone</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
          Deleting this army will permanently remove all units and photos. This cannot be undone.
        </p>
        <button
          onClick={handleDeleteArmy}
          disabled={deleteArmy || saving}
          style={{
            background: 'none', border: '1px solid rgba(224,90,90,0.5)',
            color: '#e05a5a', cursor: 'pointer', padding: '0.5rem 1.1rem',
            fontSize: '0.85rem', fontFamily: 'inherit',
            opacity: deleteArmy ? 0.5 : 1,
          }}
        >
          {deleteArmy ? 'Deleting…' : 'Delete Army'}
        </button>
      </div>
    </div>
  );
}
