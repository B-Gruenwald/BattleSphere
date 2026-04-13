'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Stat field definitions for the Crusade tracker
const STAT_FIELDS = [
  { key: 'crusade_points',     label: 'Crusade Points',     short: 'CP',       type: 'number', min: 0 },
  { key: 'requisition_points', label: 'Requisition Points', short: 'RP',       type: 'number', min: 0 },
  { key: 'supply_limit',       label: 'Supply Limit',       short: 'Limit',    type: 'number', min: 0 },
  { key: 'supply_used',        label: 'Supply Used',        short: 'Used',     type: 'number', min: 0 },
  { key: 'battles_played',     label: 'Battles Played',     short: 'Played',   type: 'number', min: 0 },
  { key: 'battles_won',        label: 'Battles Won',        short: 'Won',      type: 'number', min: 0 },
];

export default function CampaignArmySection({
  campaignId,
  playerArmies,   // all armies belonging to this player
  existingRecord, // campaign_army_records row (may be null)
  linkedArmy,     // armies row for the linked army (may be null)
  isOwnProfile,   // true only for the player themselves (controls linking)
  canEdit,        // true for player OR campaign organiser (controls stat editing)
}) {
  const router = useRouter();

  // ── Link / Unlink state ───────────────────────────────────────
  const [record, setRecord]       = useState(existingRecord ?? null);
  const [army, setArmy]           = useState(linkedArmy ?? null);
  const [selectedArmyId, setSelectedArmyId] = useState('');
  const [linking, setLinking]     = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [linkError, setLinkError] = useState('');

  // ── Stats editing state ───────────────────────────────────────
  const [editing, setEditing]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState('');
  const [form, setForm]           = useState(() => ({
    campaign_notes:     existingRecord?.campaign_notes     ?? '',
    crusade_points:     existingRecord?.crusade_points     ?? 0,
    supply_limit:       existingRecord?.supply_limit       ?? 0,
    supply_used:        existingRecord?.supply_used        ?? 0,
    battles_played:     existingRecord?.battles_played     ?? 0,
    battles_won:        existingRecord?.battles_won        ?? 0,
    requisition_points: existingRecord?.requisition_points ?? 0,
    scars_and_upgrades: existingRecord?.scars_and_upgrades ?? '',
  }));

  // ── Link an army ──────────────────────────────────────────────
  async function handleLink() {
    if (!selectedArmyId) return;
    setLinking(true);
    setLinkError('');
    try {
      const res = await fetch('/api/campaign-army-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaignId, army_id: selectedArmyId }),
      });
      const json = await res.json();
      if (!res.ok) { setLinkError(json.error || 'Failed to link army'); return; }

      const linked = playerArmies.find(a => a.id === selectedArmyId) ?? null;
      setRecord(json.record);
      setArmy(linked);
      setForm({
        campaign_notes:     '',
        crusade_points:     0,
        supply_limit:       0,
        supply_used:        0,
        battles_played:     0,
        battles_won:        0,
        requisition_points: 0,
        scars_and_upgrades: '',
      });
      router.refresh();
    } finally {
      setLinking(false);
    }
  }

  // ── Unlink an army ────────────────────────────────────────────
  async function handleUnlink() {
    if (!record) return;
    if (!confirm('Remove this army from the campaign? Crusade data will be lost.')) return;
    setUnlinking(true);
    try {
      const res = await fetch(`/api/campaign-army-records/${record.id}`, { method: 'DELETE' });
      if (!res.ok) { alert('Failed to unlink army.'); return; }
      setRecord(null);
      setArmy(null);
      setSelectedArmyId('');
      router.refresh();
    } finally {
      setUnlinking(false);
    }
  }

  // ── Save stats ────────────────────────────────────────────────
  async function handleSave() {
    if (!record) return;
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch(`/api/campaign-army-records/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) { setSaveError(json.error || 'Failed to save'); return; }
      setRecord(json.record);
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  // ── Styles ────────────────────────────────────────────────────
  const sectionStyle = {
    border: '1px solid var(--border-dim)',
    padding: '1.75rem',
    marginBottom: '1.5rem',
  };
  const labelStyle = {
    fontFamily: 'var(--font-display)',
    fontSize: '0.65rem',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--text-gold)',
    marginBottom: '1.25rem',
  };
  const inputStyle = {
    background: 'var(--bg-raised)',
    border: '1px solid var(--border-dim)',
    color: 'var(--text-primary)',
    padding: '0.5rem 0.75rem',
    fontSize: '0.9rem',
    width: '100%',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  };
  const smallLabelStyle = {
    fontFamily: 'var(--font-display)',
    fontSize: '0.5rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    display: 'block',
    marginBottom: '0.3rem',
  };

  // ────────────────────────────────────────────────────────────────
  // VIEW: no army linked yet
  // ────────────────────────────────────────────────────────────────
  if (!record) {
    if (!isOwnProfile) return null; // only the player can link an army

    const available = playerArmies ?? [];
    return (
      <div style={sectionStyle}>
        <h2 style={labelStyle}>Campaign Army</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1rem' }}>
          Link one of your armies to this campaign to track Crusade progress.
        </p>

        {available.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>
            You have no armies yet.{' '}
            <Link href="/armies/new" style={{ color: 'var(--text-gold)', textDecoration: 'none' }}>
              Create your first army →
            </Link>
          </p>
        ) : (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={selectedArmyId}
              onChange={e => setSelectedArmyId(e.target.value)}
              style={{ ...inputStyle, width: 'auto', minWidth: '220px' }}
            >
              <option value="">— Select an army —</option>
              {available.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name}{a.faction_name ? ` (${a.faction_name})` : ''}
                </option>
              ))}
            </select>
            <button
              onClick={handleLink}
              disabled={!selectedArmyId || linking}
              className="btn-primary"
              style={{ fontSize: '0.8rem' }}
            >
              {linking ? 'Linking…' : 'Link Army'}
            </button>
          </div>
        )}
        {linkError && <p style={{ color: '#e05a5a', fontSize: '0.85rem', marginTop: '0.75rem' }}>{linkError}</p>}
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────
  // VIEW: army is linked — show stats
  // ────────────────────────────────────────────────────────────────
  const gameIcon = army?.game_system?.toLowerCase().includes('40') ? '☩'
    : army?.game_system?.toLowerCase().includes('sigmar') ? '⚔'
    : '◆';

  return (
    <div style={sectionStyle}>
      {/* Section header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2 style={{ ...labelStyle, marginBottom: 0 }}>Campaign Army</h2>
        {canEdit && !editing && (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              onClick={() => setEditing(true)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
            >
              Edit Stats →
            </button>
            {isOwnProfile && (
              <button
                onClick={handleUnlink}
                disabled={unlinking}
                style={{ background: 'none', border: 'none', color: '#e05a5a', fontSize: '0.72rem', cursor: 'pointer', padding: 0, opacity: 0.7 }}
              >
                {unlinking ? 'Removing…' : 'Unlink'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Army identity row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {/* Cover thumb */}
        <div style={{ width: '72px', height: '48px', flexShrink: 0, background: 'var(--surface-2)', border: '1px solid var(--border-dim)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {army?.cover_image_url
            ? <img src={army.cover_image_url} alt={army.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ color: 'var(--border-dim)', fontSize: '1.2rem' }}>{gameIcon}</span>
          }
        </div>
        <div>
          <Link href={`/armies/${army?.id}`} style={{ textDecoration: 'none' }}>
            <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)', letterSpacing: '0.03em' }}>
              {army?.name ?? 'Unknown Army'}
            </div>
          </Link>
          {(army?.game_system || army?.faction_name) && (
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.5rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-gold)', marginTop: '0.2rem' }}>
              {[army?.game_system, army?.faction_name].filter(Boolean).join(' · ')}
            </div>
          )}
          {army?.tagline && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', marginTop: '0.2rem' }}>
              "{army.tagline}"
            </div>
          )}
        </div>
      </div>

      {/* ── EDIT MODE ─────────────────────────────────────────── */}
      {editing && canEdit && (
        <div>
          {/* Numeric stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            {STAT_FIELDS.map(field => (
              <div key={field.key}>
                <label style={smallLabelStyle}>{field.label}</label>
                <input
                  type="number"
                  min={field.min}
                  value={form[field.key]}
                  onChange={e => setForm(f => ({ ...f, [field.key]: parseInt(e.target.value, 10) || 0 }))}
                  style={inputStyle}
                />
              </div>
            ))}
          </div>

          {/* Scars & Upgrades */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={smallLabelStyle}>Scars &amp; Upgrades</label>
            <textarea
              value={form.scars_and_upgrades}
              onChange={e => setForm(f => ({ ...f, scars_and_upgrades: e.target.value }))}
              rows={3}
              placeholder="Battle scars, veteran abilities, relics earned…"
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {/* Campaign notes */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={smallLabelStyle}>Campaign Notes</label>
            <textarea
              value={form.campaign_notes}
              onChange={e => setForm(f => ({ ...f, campaign_notes: e.target.value }))}
              rows={3}
              placeholder="Notes about this army's role in the campaign…"
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {saveError && <p style={{ color: '#e05a5a', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{saveError}</p>}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ fontSize: '0.8rem' }}>
              {saving ? 'Saving…' : 'Save Stats'}
            </button>
            <button onClick={() => setEditing(false)} className="btn-secondary" style={{ fontSize: '0.8rem' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── DISPLAY MODE ──────────────────────────────────────── */}
      {!editing && (
        <>
          {/* Stats bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', borderTop: '1px solid var(--border-dim)', borderBottom: '1px solid var(--border-dim)', marginBottom: '1.25rem' }}>
            {STAT_FIELDS.map((field, i, arr) => (
              <div
                key={field.key}
                style={{ padding: '0.9rem 0.5rem', textAlign: 'center', borderRight: i < arr.length - 1 ? '1px solid var(--border-dim)' : 'none' }}
              >
                <div style={{ fontSize: '1.4rem', fontWeight: '700', color: record[field.key] > 0 ? 'var(--text-primary)' : 'var(--text-muted)', marginBottom: '0.2rem' }}>
                  {record[field.key] ?? 0}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.48rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>
                  {field.short}
                </div>
              </div>
            ))}
          </div>

          {/* Scars & Upgrades */}
          {record.scars_and_upgrades && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ ...smallLabelStyle, marginBottom: '0.4rem' }}>Scars &amp; Upgrades</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {record.scars_and_upgrades}
              </p>
            </div>
          )}

          {/* Campaign notes */}
          {record.campaign_notes && (
            <div>
              <div style={{ ...smallLabelStyle, marginBottom: '0.4rem' }}>Campaign Notes</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {record.campaign_notes}
              </p>
            </div>
          )}

          {/* Empty state hint for editors */}
          {canEdit && !record.scars_and_upgrades && !record.campaign_notes && (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>
              No notes yet — click Edit Stats to add Crusade data.
            </p>
          )}
        </>
      )}
    </div>
  );
}
