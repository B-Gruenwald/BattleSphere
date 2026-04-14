'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const UNIT_STAT_FIELDS = [
  { key: 'experience_points', label: 'Experience', short: 'XP',     type: 'number', min: 0 },
  { key: 'kills',             label: 'Kills',       short: 'Kills',  type: 'number', min: 0 },
  { key: 'crusade_points',   label: 'Crusade Pts', short: 'CP',     type: 'number', min: 0 },
];

// XP rank thresholds (WH40K Crusade)
function getUnitRank(xp) {
  if (xp >= 12) return 'Legendary';
  if (xp >= 8)  return 'Heroic';
  if (xp >= 4)  return 'Battle-Hardened';
  if (xp >= 1)  return 'Blooded';
  return 'Fresh';
}

function UnitRow({ cur, armyUnit, canEdit, isOwnProfile, campaignArmyRecordId }) {
  const router = useRouter();
  const [editing, setEditing]   = useState(false);
  const [removing, setRemoving] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [form, setForm]         = useState({
    experience_points: cur.experience_points ?? 0,
    kills:             cur.kills             ?? 0,
    crusade_points:    cur.crusade_points    ?? 0,
    upgrades:          cur.upgrades          ?? '',
    scars:             cur.scars             ?? '',
  });
  // Live display state (updated after save)
  const [saved, setSaved] = useState(cur);

  const rank = getUnitRank(saved.experience_points);

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/crusade-units/${cur.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Save failed'); return; }
      setSaved(json.record);
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!confirm(`Remove "${armyUnit?.name ?? 'this unit'}" from the Crusade force? Its data will be lost.`)) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/crusade-units/${cur.id}`, { method: 'DELETE' });
      if (!res.ok) { alert('Failed to remove unit.'); setRemoving(false); return; }
      router.refresh();
    } catch {
      setRemoving(false);
    }
  }

  const inputStyle = {
    background: 'var(--bg-raised)',
    border: '1px solid var(--border-dim)',
    color: 'var(--text-primary)',
    padding: '0.35rem 0.6rem',
    fontSize: '1rem',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
  };
  const smallLabel = {
    fontFamily: 'var(--font-display)',
    fontSize: '0.48rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    display: 'block',
    marginBottom: '0.25rem',
  };

  return (
    <div style={{ border: '1px solid var(--border-dim)', marginBottom: '0.75rem' }}>
      {/* Unit header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderBottom: editing ? '1px solid var(--border-dim)' : 'none', flexWrap: 'wrap' }}>
        {/* Diamond icon */}
        <div style={{ width: '6px', height: '6px', background: 'var(--gold)', transform: 'rotate(45deg)', flexShrink: 0, opacity: 0.6 }} />

        {/* Name + type */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {armyUnit?.name ?? 'Unknown Unit'}
          </div>
          {armyUnit?.unit_type && (
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.48rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
              {armyUnit.unit_type}
            </div>
          )}
        </div>

        {/* Stat pills */}
        {!editing && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.48rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-gold)', border: '1px solid rgba(183,140,64,0.3)', padding: '0.2rem 0.5rem' }}>
              {rank}
            </span>
            {UNIT_STAT_FIELDS.map(f => (
              <div key={f.key} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1rem', fontWeight: '700', color: saved[f.key] > 0 ? 'var(--text-primary)' : 'var(--text-muted)', lineHeight: 1 }}>
                  {saved[f.key] ?? 0}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.42rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>
                  {f.short}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        {canEdit && !editing && (
          <button
            onClick={() => setEditing(true)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.72rem', cursor: 'pointer', padding: 0, flexShrink: 0 }}
          >
            Edit →
          </button>
        )}
        {isOwnProfile && !editing && (
          <button
            onClick={handleRemove}
            disabled={removing}
            style={{ background: 'none', border: 'none', color: '#e05a5a', fontSize: '0.65rem', cursor: 'pointer', padding: 0, opacity: 0.65, flexShrink: 0 }}
          >
            {removing ? '…' : '✕'}
          </button>
        )}
      </div>

      {/* Collapsed summary: upgrades + scars */}
      {!editing && (saved.upgrades || saved.scars) && (
        <div style={{ padding: '0.6rem 1rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
          {saved.upgrades && (
            <div>
              <span style={smallLabel}>Upgrades</span>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{saved.upgrades}</p>
            </div>
          )}
          {saved.scars && (
            <div>
              <span style={smallLabel}>Battle Scars</span>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{saved.scars}</p>
            </div>
          )}
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <div style={{ padding: '1rem' }}>
          {/* Numeric stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.6rem', marginBottom: '0.75rem' }}>
            {UNIT_STAT_FIELDS.map(f => (
              <div key={f.key}>
                <label style={smallLabel}>{f.label}</label>
                <input
                  type="number"
                  min={f.min}
                  value={form[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: parseInt(e.target.value, 10) || 0 }))}
                  style={inputStyle}
                />
              </div>
            ))}
          </div>
          {/* Upgrades */}
          <div style={{ marginBottom: '0.6rem' }}>
            <label style={smallLabel}>Upgrades / Battle Honours</label>
            <textarea
              value={form.upgrades}
              onChange={e => setForm(prev => ({ ...prev, upgrades: e.target.value }))}
              rows={2}
              placeholder="Veteran abilities, relics, wargear upgrades…"
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
          {/* Scars */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={smallLabel}>Battle Scars</label>
            <textarea
              value={form.scars}
              onChange={e => setForm(prev => ({ ...prev, scars: e.target.value }))}
              rows={2}
              placeholder="Lasting injuries and afflictions…"
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
          {error && <p style={{ color: '#e05a5a', fontSize: '0.82rem', marginBottom: '0.5rem' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ fontSize: '0.78rem' }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => { setEditing(false); setError(''); }} className="btn-secondary" style={{ fontSize: '0.78rem' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CrusadeRoster({
  campaignArmyRecordId,
  initialCrusadeUnits,  // crusade_unit_records rows
  armyUnits,            // all army_units rows for this army
  canEdit,
  isOwnProfile,
}) {
  const router = useRouter();
  const [crusadeUnits, setCrusadeUnits] = useState(initialCrusadeUnits ?? []);
  const [enlistId, setEnlistId]         = useState('');
  const [enlisting, setEnlisting]       = useState(false);
  const [enlistError, setEnlistError]   = useState('');

  // Map for quick lookup
  const unitMap = Object.fromEntries((armyUnits ?? []).map(u => [u.id, u]));

  // Units not yet enlisted
  const enlistedIds = new Set(crusadeUnits.map(r => r.army_unit_id));
  const available   = (armyUnits ?? []).filter(u => !enlistedIds.has(u.id));

  async function handleEnlist() {
    if (!enlistId) return;
    setEnlisting(true);
    setEnlistError('');
    try {
      const res = await fetch('/api/crusade-units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_army_record_id: campaignArmyRecordId, army_unit_id: enlistId }),
      });
      const json = await res.json();
      if (!res.ok) { setEnlistError(json.error || 'Failed to enlist unit'); return; }
      setCrusadeUnits(prev => [...prev, json.record]);
      setEnlistId('');
      router.refresh();
    } finally {
      setEnlisting(false);
    }
  }

  const sectionLabel = {
    fontFamily: 'var(--font-display)',
    fontSize: '0.6rem',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--text-gold)',
  };

  return (
    <div style={{ marginTop: '1.5rem' }}>
      {/* Roster heading */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
        <span style={sectionLabel}>
          Crusade Roster — {crusadeUnits.length} {crusadeUnits.length === 1 ? 'unit' : 'units'}
        </span>
      </div>

      {/* Enlisted units */}
      {crusadeUnits.length > 0 ? (
        crusadeUnits.map(cur => (
          <UnitRow
            key={cur.id}
            cur={cur}
            armyUnit={unitMap[cur.army_unit_id] ?? null}
            canEdit={canEdit}
            isOwnProfile={isOwnProfile}
            campaignArmyRecordId={campaignArmyRecordId}
          />
        ))
      ) : (
        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
          No units enlisted yet.{isOwnProfile ? ' Use the selector below to add units from your army.' : ''}
        </p>
      )}

      {/* Enlist a unit (owner only) */}
      {isOwnProfile && (
        <div style={{ marginTop: '0.75rem' }}>
          {available.length > 0 ? (
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                value={enlistId}
                onChange={e => setEnlistId(e.target.value)}
                style={{
                  background: 'var(--bg-raised)',
                  border: '1px solid var(--border-dim)',
                  color: 'var(--text-primary)',
                  padding: '0.4rem 0.7rem',
                  fontSize: '0.85rem',
                  fontFamily: 'inherit',
                  minWidth: '200px',
                }}
              >
                <option value="">— Add unit to Crusade —</option>
                {available.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name}{u.unit_type ? ` (${u.unit_type})` : ''}
                  </option>
                ))}
              </select>
              <button
                onClick={handleEnlist}
                disabled={!enlistId || enlisting}
                className="btn-secondary"
                style={{ fontSize: '0.78rem' }}
              >
                {enlisting ? 'Enlisting…' : 'Enlist'}
              </button>
            </div>
          ) : (armyUnits ?? []).length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.82rem' }}>
              This army has no units yet. Add units via the army edit page first.
            </p>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.82rem' }}>
              All units from this army are already enlisted.
            </p>
          )}
          {enlistError && <p style={{ color: '#e05a5a', fontSize: '0.82rem', marginTop: '0.4rem' }}>{enlistError}</p>}
        </div>
      )}
    </div>
  );
}
