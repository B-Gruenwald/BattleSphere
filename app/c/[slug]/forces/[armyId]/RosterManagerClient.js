'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CrusadeRoster from '@/app/components/CrusadeRoster';

// ── Shared styles ─────────────────────────────────────────────────────────────
const labelStyle = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.6rem',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--text-gold)',
};
const mutedLabelStyle = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.5rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
};
const inputStyle = {
  background: 'var(--bg-raised)',
  border: '1px solid var(--border-dim)',
  color: 'var(--text-primary)',
  padding: '0.5rem 0.75rem',
  fontSize: '1rem',
  width: '100%',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};
const sectionStyle = {
  border: '1px solid var(--border-dim)',
  padding: '1.5rem',
  marginBottom: '1.25rem',
};

// ── Game-system stat config ───────────────────────────────────────────────────
function getStatFields(gameSystem) {
  const gs = (gameSystem ?? '').toLowerCase();
  if (gs.includes('kill team')) {
    return {
      mode: 'killteam',
      fields: [
        { key: 'battles_played',     label: 'Battles Played', short: 'Played', type: 'number' },
        { key: 'battles_won',        label: 'Battles Won',    short: 'Won',    type: 'number' },
        { key: 'kt_equipment_points', label: 'Equipment Pts', short: 'EQ Pts', type: 'number' },
      ],
      textFields: [
        { key: 'kt_spec_ops_note', label: 'Spec Ops Note', placeholder: 'Which Spec Op is this team running?' },
      ],
    };
  }
  if (gs.includes('40') || gs.includes('horus') || gs.includes('30k') || gs.includes('warhammer 40')) {
    return {
      mode: 'crusade',
      fields: [
        { key: 'supply_limit',       label: 'Supply Limit',       short: 'Limit',  type: 'number' },
        { key: 'supply_used',        label: 'Supply Used',        short: 'Used',   type: 'number' },
        { key: 'crusade_points',     label: 'Crusade Points',     short: 'CP',     type: 'number' },
        { key: 'requisition_points', label: 'Requisition Points', short: 'RP',     type: 'number' },
        { key: 'battles_played',     label: 'Battles Played',     short: 'Played', type: 'number' },
        { key: 'battles_won',        label: 'Battles Won',        short: 'Won',    type: 'number' },
      ],
      textFields: [
        { key: 'scars_and_upgrades', label: 'Scars & Upgrades', placeholder: 'Record any persistent army-level scars or upgrades…' },
        { key: 'campaign_notes',     label: 'Campaign Notes',   placeholder: "Notes about this army's role in the campaign…" },
      ],
    };
  }
  // Default — free-form
  return {
    mode: 'other',
    fields: [
      { key: 'battles_played', label: 'Battles Played', short: 'Played', type: 'number' },
      { key: 'battles_won',    label: 'Battles Won',    short: 'Won',    type: 'number' },
    ],
    textFields: [
      { key: 'campaign_notes', label: 'Campaign Notes', placeholder: "Notes about this army's role in the campaign…" },
    ],
  };
}

// ── Stat grid (read-only) ─────────────────────────────────────────────────────
function StatGrid({ record, fields }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${Math.min(fields.length, 6)}, 1fr)`,
      borderTop: '1px solid var(--border-dim)',
      borderBottom: '1px solid var(--border-dim)',
    }}>
      {fields.map((f, i, arr) => (
        <div key={f.key} style={{
          padding: '0.9rem 0.5rem',
          textAlign: 'center',
          borderRight: i < arr.length - 1 ? '1px solid var(--border-dim)' : 'none',
        }}>
          <div style={{
            fontSize: '1.4rem',
            fontWeight: '700',
            color: (record[f.key] ?? 0) > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
            marginBottom: '0.2rem',
          }}>
            {record[f.key] ?? 0}
          </div>
          <div style={{ ...labelStyle, fontSize: '0.44rem' }}>{f.short}</div>
        </div>
      ))}
    </div>
  );
}

// ── Battle history row ────────────────────────────────────────────────────────
function BattleRow({ battle, armyId, campaignSlug }) {
  const isAttacker = battle.army_id_p1 === armyId;
  const myFaction  = isAttacker ? battle.attackerFaction : battle.defenderFaction;
  const oppFaction = isAttacker ? battle.defenderFaction : battle.attackerFaction;

  let result = 'Draw';
  let resultColour = 'var(--text-muted)';
  if (battle.winner_faction_id) {
    const won = myFaction?.id === battle.winner_faction_id;
    result = won ? 'Victory' : 'Defeat';
    resultColour = won ? '#6bbf6b' : '#e05a5a';
  }

  return (
    <Link href={`/c/${campaignSlug}/battle/${battle.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.75rem 1rem',
        borderBottom: '1px solid var(--border-dim)',
        flexWrap: 'wrap',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
      >
        <div style={{ flex: 1, minWidth: '120px' }}>
          {battle.headline ? (
            <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.1rem' }}>{battle.headline}</div>
          ) : (
            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              {myFaction?.name ?? '?'} vs {oppFaction?.name ?? '?'}
            </div>
          )}
          {battle.territory && (
            <div style={{ ...mutedLabelStyle, fontSize: '0.44rem' }}>{battle.territory.name}</div>
          )}
        </div>
        <div style={{ fontWeight: '700', fontSize: '0.85rem', color: resultColour, minWidth: '55px', textAlign: 'right' }}>
          {result}
        </div>
        <div style={{ ...mutedLabelStyle, fontSize: '0.44rem', textAlign: 'right' }}>
          {new Date(battle.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>
    </Link>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RosterManagerClient({
  campaign,
  army,
  record: initialRecord,
  campaignFaction: initialCampaignFaction,
  factions,
  units,
  crusadeUnits,
  battles,
  canEdit,
  isOwner,
  ownerProfile,
}) {
  const router = useRouter();
  const statConfig = getStatFields(army.game_system);

  const [record,          setRecord]          = useState(initialRecord);
  const [campaignFaction, setCampaignFaction] = useState(initialCampaignFaction);
  const [editing,         setEditing]         = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [saveError,       setSaveError]       = useState('');
  const [undeploy,        setUndeploy]        = useState(false);
  const [undeploying,     setUndeploying]     = useState(false);

  // Initialise form from record
  const [form, setForm] = useState(() => {
    const f = {};
    for (const field of [...(statConfig.fields || []), ...(statConfig.textFields || [])]) {
      f[field.key] = initialRecord[field.key] ?? (field.type === 'number' ? 0 : '');
    }
    f.faction_id = initialRecord.faction_id ?? '';
    return f;
  });

  function setFormField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch(`/api/campaign-army-records/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) { setSaveError(json.error || 'Save failed'); return; }
      setRecord(json.record);
      const updatedFaction = factions.find(f => f.id === json.record.faction_id) ?? null;
      setCampaignFaction(updatedFaction);
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleUndeploy() {
    if (!confirm(`Remove "${army.name}" from ${campaign.name}? All Crusade data for this deployment will be lost.`)) return;
    setUndeploying(true);
    try {
      const res = await fetch(`/api/campaign-army-records/${record.id}`, { method: 'DELETE' });
      if (!res.ok) { alert('Failed to remove army.'); setUndeploying(false); return; }
      router.push(`/c/${campaign.slug}/forces`);
    } catch {
      setUndeploying(false);
    }
  }

  const gameIcon = (army.game_system ?? '').toLowerCase().includes('kill team') ? '⚡'
    : (army.game_system ?? '').toLowerCase().includes('40') ? '☩'
    : (army.game_system ?? '').toLowerCase().includes('sigmar') ? '⚔'
    : '◆';

  return (
    <>
      {/* ── Army header ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {/* Cover thumbnail */}
        <div style={{
          width: '88px', height: '88px', flexShrink: 0,
          background: 'var(--bg-raised)', border: '1px solid var(--border-dim)',
          overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {army.cover_image_url
            ? <img src={army.cover_image_url} alt={army.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ color: 'var(--border-dim)', fontSize: '1.6rem' }}>{gameIcon}</span>
          }
        </div>

        {/* Info */}
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 'clamp(1.1rem, 3vw, 1.5rem)', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            {army.name}
          </h1>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.5rem' }}>
            {army.game_system && (
              <span style={{ ...labelStyle, fontSize: '0.48rem', border: '1px solid var(--gold)', padding: '0.15rem 0.5rem' }}>
                {army.game_system}
              </span>
            )}
            {army.faction_name && (
              <span style={{ ...mutedLabelStyle }}>{army.faction_name}</span>
            )}
            {campaignFaction && (
              <span style={{ ...mutedLabelStyle, color: campaignFaction.colour ?? 'var(--text-muted)' }}>
                ● {campaignFaction.name}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link href={`/armies/${army.id}`} style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textDecoration: 'none' }}>
              View Army Portfolio ↗
            </Link>
            {ownerProfile && ownerProfile.id !== undefined && (
              <Link href={`/c/${campaign.slug}/player/${ownerProfile.id}`} style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textDecoration: 'none' }}>
                {ownerProfile.username}'s Profile
              </Link>
            )}
          </div>
        </div>

        {/* Actions */}
        {canEdit && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {!editing && (
              <button onClick={() => setEditing(true)} className="btn-secondary" style={{ fontSize: '0.78rem' }}>
                Edit Force Stats
              </button>
            )}
            {isOwner && (
              <button
                onClick={handleUndeploy}
                disabled={undeploying}
                style={{ background: 'none', border: 'none', color: '#e05a5a', fontSize: '0.72rem', cursor: 'pointer', padding: '0.5rem 0', opacity: 0.7 }}
              >
                {undeploying ? 'Removing…' : 'Undeploy'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Campaign stats section ───────────────────────────────── */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 style={{ ...labelStyle, marginBottom: 0 }}>
            {statConfig.mode === 'crusade' ? 'Crusade Record'
              : statConfig.mode === 'killteam' ? 'Kill Team Roster'
              : 'Campaign Record'}
          </h2>
          {canEdit && editing && (
            <span style={{ ...mutedLabelStyle }}>Editing…</span>
          )}
        </div>

        {/* ── EDIT MODE ─────────────────────────────────────────── */}
        {editing && canEdit ? (
          <div>
            {/* Faction picker */}
            {factions.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ ...mutedLabelStyle, display: 'block', marginBottom: '0.35rem' }}>Fighting for faction</label>
                <select
                  value={form.faction_id}
                  onChange={e => setFormField('faction_id', e.target.value)}
                  style={inputStyle}
                >
                  <option value="">— None / unaligned —</option>
                  {factions.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Numeric stat fields */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
              {statConfig.fields.map(field => (
                <div key={field.key}>
                  <label style={{ ...mutedLabelStyle, display: 'block', marginBottom: '0.3rem' }}>{field.label}</label>
                  <input
                    type="number"
                    min={0}
                    value={form[field.key] ?? 0}
                    onChange={e => setFormField(field.key, parseInt(e.target.value, 10) || 0)}
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>

            {/* Text fields */}
            {statConfig.textFields.map(tf => (
              <div key={tf.key} style={{ marginBottom: '1rem' }}>
                <label style={{ ...mutedLabelStyle, display: 'block', marginBottom: '0.35rem' }}>{tf.label}</label>
                <textarea
                  value={form[tf.key] ?? ''}
                  onChange={e => setFormField(tf.key, e.target.value)}
                  rows={3}
                  placeholder={tf.placeholder}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
            ))}

            {saveError && <p style={{ color: '#e05a5a', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{saveError}</p>}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ fontSize: '0.8rem' }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setEditing(false)} className="btn-secondary" style={{ fontSize: '0.8rem' }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* ── READ MODE ──────────────────────────────────────────── */
          <>
            <StatGrid record={record} fields={statConfig.fields} />

            {/* Text field display */}
            {statConfig.textFields.map(tf => record[tf.key] ? (
              <div key={tf.key} style={{ marginTop: '1rem' }}>
                <div style={{ ...mutedLabelStyle, marginBottom: '0.3rem' }}>{tf.label}</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {record[tf.key]}
                </p>
              </div>
            ) : null)}

            {canEdit && (
              <button
                onClick={() => setEditing(true)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', padding: 0, marginTop: '1rem' }}
              >
                Edit stats →
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Unit roster ─────────────────────────────────────────────── */}
      <div style={sectionStyle}>
        <h2 style={{ ...labelStyle, marginBottom: '1.25rem' }}>
          {statConfig.mode === 'crusade' ? 'Crusade Roster'
            : statConfig.mode === 'killteam' ? 'Operatives'
            : 'Unit Roster'}
        </h2>
        <CrusadeRoster
          campaignArmyRecordId={record.id}
          initialCrusadeUnits={crusadeUnits}
          armyUnits={units}
          canEdit={canEdit}
          isOwnProfile={isOwner}
        />
      </div>

      {/* ── Battle history ────────────────────────────────────────── */}
      <div style={sectionStyle}>
        <h2 style={{ ...labelStyle, marginBottom: '1.25rem' }}>Battle Record</h2>
        {battles.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontStyle: 'italic' }}>
            No battles recorded with this army yet. Select this army when logging a battle to start tracking.
          </p>
        ) : (
          <div style={{ border: '1px solid var(--border-dim)' }}>
            {battles.map(b => (
              <BattleRow key={b.id} battle={b} armyId={army.id} campaignSlug={campaign.slug} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
