'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const BATTLE_TYPES = [
  'KillTeam / Gang War',
  'Boarding Action',
  'Combat Patrol',
  'Incursion',
  'Strike Force',
  'Onslaught',
  'Apocalypse',
];

const EVENT_TYPES = [
  { value: 'narrative',     label: 'Narrative'      },
  { value: 'mechanic',      label: 'Game Mechanic'  },
  { value: 'special_rule',  label: 'Special Rule'   },
  { value: 'mission',       label: 'Mission'        },
];

const STATUS_OPTIONS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'active',   label: 'Active'   },
  { value: 'resolved', label: 'Resolved' },
];

const TYPE_LABELS = {
  narrative:    'Narrative',
  mechanic:     'Game Mechanic',
  special_rule: 'Special Rule',
  mission:      'Mission',
};

const STATUS_COLOURS = {
  upcoming: '#6a8fc7',
  active:   '#b78c40',
  resolved: '#5a5445',
};

// ── Input helpers ──────────────────────────────────────────────

const inputStyle = {
  width: '100%',
  background: 'var(--bg-raised)',
  border: '1px solid var(--border-subtle)',
  color: 'var(--text-primary)',
  padding: '0.65rem 0.85rem',
  fontFamily: 'var(--font-body)',
  fontSize: '1rem',
  outline: 'none',
};

const labelStyle = {
  display: 'block',
  fontFamily: 'var(--font-display)',
  fontSize: '0.6rem',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--text-gold)',
  marginBottom: '0.5rem',
};

const fieldStyle = { marginBottom: '1.5rem' };

// ──────────────────────────────────────────────────────────────

export default function EventForm({
  campaign,
  factions,
  territories,
  userId,
  existingEvent = null,   // pass when editing
}) {
  const router = useRouter();
  const supabase = createClient();
  const isEditing = !!existingEvent;

  const [title,              setTitle]              = useState(existingEvent?.title || '');
  const [body,               setBody]               = useState(existingEvent?.body || '');
  const [eventType,          setEventType]          = useState(existingEvent?.event_type || 'narrative');
  const [status,             setStatus]             = useState(existingEvent?.status || 'active');
  const [affectedFactions,   setAffectedFactions]   = useState(existingEvent?.affected_factions || []);
  const [startsAt,           setStartsAt]           = useState(
    existingEvent?.starts_at ? existingEvent.starts_at.slice(0, 16) : ''
  );
  const [endsAt,             setEndsAt]             = useState(
    existingEvent?.ends_at ? existingEvent.ends_at.slice(0, 16) : ''
  );

  // ── Influence bonus state ────────────────────────────────────────────────────
  const hasExistingBonus = existingEvent?.influence_bonus != null;
  const [bonusEnabled,       setBonusEnabled]       = useState(hasExistingBonus);
  const [influenceBonus,     setInfluenceBonus]     = useState(existingEvent?.influence_bonus ?? 1);
  const [bonusTerritoryIds,  setBonusTerritoryIds]  = useState(existingEvent?.bonus_territory_ids ?? []);
  const [bonusBattleTypes,   setBonusBattleTypes]   = useState(existingEvent?.bonus_battle_types  ?? []);
  const [bonusFactionIds,    setBonusFactionIds]    = useState(existingEvent?.bonus_faction_ids   ?? []);

  const [submitting,         setSubmitting]         = useState(false);
  const [error,              setError]              = useState('');

  function toggleFaction(factionId) {
    setAffectedFactions(prev =>
      prev.includes(factionId)
        ? prev.filter(id => id !== factionId)
        : [...prev, factionId]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required.'); return; }
    setSubmitting(true);
    setError('');

    const payload = {
      campaign_id:        campaign.id,
      title:              title.trim(),
      body:               body.trim() || null,
      event_type:         eventType,
      status,
      affected_factions:  affectedFactions.length > 0 ? affectedFactions : null,
      starts_at:          startsAt || null,
      ends_at:            endsAt || null,
      // Influence bonus — null out all fields when bonus is disabled
      influence_bonus:     bonusEnabled ? (parseInt(influenceBonus) || 1) : null,
      bonus_territory_ids: bonusEnabled && bonusTerritoryIds.length > 0 ? bonusTerritoryIds : null,
      bonus_battle_types:  bonusEnabled && bonusBattleTypes.length  > 0 ? bonusBattleTypes  : null,
      bonus_faction_ids:   bonusEnabled && bonusFactionIds.length   > 0 ? bonusFactionIds   : null,
      ...(!isEditing && { created_by: userId }),
    };

    let result;
    if (isEditing) {
      result = await supabase
        .from('campaign_events')
        .update(payload)
        .eq('id', existingEvent.id)
        .select('*')
        .single();
    } else {
      result = await supabase
        .from('campaign_events')
        .insert(payload)
        .select('*')
        .single();
    }

    if (result.error) {
      setError(result.error.message);
      setSubmitting(false);
      return;
    }

    router.push(`/c/${campaign.slug}/events/${result.data.id}`);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm('Delete this event? This cannot be undone.')) return;
    setSubmitting(true);
    await supabase.from('campaign_events').delete().eq('id', existingEvent.id);
    router.push(`/c/${campaign.slug}/events`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '680px' }}>

      {/* Title */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Event Title *</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. The Gates of Vaelthor Open"
          style={inputStyle}
          required
        />
      </div>

      {/* Body */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Narrative Body</label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Describe what is happening in the campaign world…"
          rows={7}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
        />
      </div>

      {/* Type + Status row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={labelStyle}>Event Type</label>
          <select
            value={eventType}
            onChange={e => setEventType(e.target.value)}
            style={{ ...inputStyle }}
          >
            {EVENT_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            style={{ ...inputStyle }}
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Start / End dates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={labelStyle}>Starts At (optional)</label>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={e => setStartsAt(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Ends At (optional)</label>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={e => setEndsAt(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Affected factions */}
      {factions && factions.length > 0 && (
        <div style={fieldStyle}>
          <label style={labelStyle}>Affected Factions</label>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
            Leave all unselected to apply this event to the whole campaign.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {factions.map(f => {
              const selected = affectedFactions.includes(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggleFaction(f.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.35rem 0.75rem',
                    background: selected ? 'rgba(183,140,64,0.12)' : 'var(--bg-raised)',
                    border: `1px solid ${selected ? 'rgba(183,140,64,0.5)' : 'var(--border-subtle)'}`,
                    color: selected ? 'var(--text-gold)' : 'var(--text-secondary)',
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.58rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{
                    width: '8px', height: '8px',
                    background: f.colour,
                    display: 'inline-block',
                    flexShrink: 0,
                  }} />
                  {f.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Influence Bonus ── */}
      <div style={{ ...fieldStyle, paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setBonusEnabled(v => !v)}
            style={{
              width: '36px', height: '20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              background: bonusEnabled ? 'var(--text-gold)' : 'var(--border-subtle)',
              position: 'relative', flexShrink: 0, transition: 'background 0.2s',
            }}
            aria-label="Toggle influence bonus"
          >
            <span style={{
              position: 'absolute', top: '2px',
              left: bonusEnabled ? '18px' : '2px',
              width: '16px', height: '16px', borderRadius: '50%',
              background: '#fff', transition: 'left 0.2s',
            }} />
          </button>
          <label style={{ ...labelStyle, margin: 0, cursor: 'pointer' }} onClick={() => setBonusEnabled(v => !v)}>
            Influence Bonus
          </label>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: bonusEnabled ? '1.25rem' : 0 }}>
          {bonusEnabled
            ? 'Battles matching the conditions below will grant a flat influence & XP bonus to both factions while this event is Active.'
            : 'Enable to grant a flat influence & XP bonus to qualifying battles during this event.'}
        </p>

        {bonusEnabled && (
          <>
            {/* Bonus amount */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>Bonus Amount (influence & XP, per player)</label>
              <input
                type="number"
                min="1"
                value={influenceBonus}
                onChange={e => setInfluenceBonus(e.target.value)}
                style={{ ...inputStyle, width: '120px' }}
              />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.35rem' }}>
                Both factions earn this much influence on the territory. Both players earn this much XP.
              </p>
            </div>

            {/* Conditions header */}
            <label style={{ ...labelStyle, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Conditions
            </label>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '1.25rem' }}>
              A battle must satisfy <strong style={{ color: 'var(--text-secondary)' }}>all</strong> condition types that have selections. Within each type, <strong style={{ color: 'var(--text-secondary)' }}>any one</strong> selection is enough. Leave a type empty to match any value.
            </p>

            {/* Territory condition — scrollable checkbox list */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ ...labelStyle, fontSize: '0.55rem' }}>
                Territory{bonusTerritoryIds.length > 0 ? ` (${bonusTerritoryIds.length} selected)` : ' — any'}
              </label>
              {(territories || []).length > 0 ? (
                <div style={{
                  maxHeight: '200px', overflowY: 'auto',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-raised)',
                }}>
                  {(territories || []).map(t => {
                    const selected = bonusTerritoryIds.includes(t.id);
                    const indent = ((t.depth || 1) - 1) * 1.1;
                    return (
                      <label key={t.id} style={{
                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                        padding: '0.45rem 0.75rem',
                        paddingLeft: `${0.75 + indent}rem`,
                        cursor: 'pointer',
                        background: selected ? 'rgba(183,140,64,0.08)' : 'transparent',
                        borderBottom: '1px solid var(--border-subtle)',
                        fontSize: '0.85rem',
                        color: selected ? 'var(--text-gold)' : 'var(--text-secondary)',
                        userSelect: 'none',
                      }}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() =>
                            setBonusTerritoryIds(prev =>
                              selected ? prev.filter(id => id !== t.id) : [...prev, t.id]
                            )
                          }
                          style={{ accentColor: 'var(--text-gold)', flexShrink: 0 }}
                        />
                        {t.depth > 1 && (
                          <span style={{ color: 'var(--border-dim)', fontSize: '0.7rem' }}>↳</span>
                        )}
                        {t.name}
                        {t.type && t.depth > 1 && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginLeft: 'auto' }}>
                            {t.type}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                  No territories found for this campaign.
                </p>
              )}
            </div>

            {/* Battle type condition */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ ...labelStyle, fontSize: '0.55rem' }}>
                Battle Type{bonusBattleTypes.length > 0 ? ` (${bonusBattleTypes.length} selected)` : ' — any'}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {BATTLE_TYPES.map(t => {
                  const selected = bonusBattleTypes.includes(t);
                  return (
                    <button key={t} type="button" onClick={() =>
                      setBonusBattleTypes(prev => selected ? prev.filter(v => v !== t) : [...prev, t])
                    } style={{
                      padding: '0.3rem 0.65rem',
                      background: selected ? 'rgba(183,140,64,0.12)' : 'var(--bg-raised)',
                      border: `1px solid ${selected ? 'rgba(183,140,64,0.5)' : 'var(--border-subtle)'}`,
                      color: selected ? 'var(--text-gold)' : 'var(--text-secondary)',
                      fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.1em',
                      textTransform: 'uppercase', cursor: 'pointer',
                    }}>{t}</button>
                  );
                })}
              </div>
            </div>

            {/* Faction condition */}
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ ...labelStyle, fontSize: '0.55rem' }}>
                Faction Involved{bonusFactionIds.length > 0 ? ` (${bonusFactionIds.length} selected)` : ' — any'}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {(factions || []).map(f => {
                  const selected = bonusFactionIds.includes(f.id);
                  return (
                    <button key={f.id} type="button" onClick={() =>
                      setBonusFactionIds(prev => selected ? prev.filter(id => id !== f.id) : [...prev, f.id])
                    } style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      padding: '0.3rem 0.65rem',
                      background: selected ? 'rgba(183,140,64,0.12)' : 'var(--bg-raised)',
                      border: `1px solid ${selected ? 'rgba(183,140,64,0.5)' : 'var(--border-subtle)'}`,
                      color: selected ? 'var(--text-gold)' : 'var(--text-secondary)',
                      fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.1em',
                      textTransform: 'uppercase', cursor: 'pointer',
                    }}>
                      <span style={{ width: '8px', height: '8px', background: f.colour, display: 'inline-block', flexShrink: 0 }} />
                      {f.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {error && (
        <p style={{ color: 'var(--crimson-bright)', fontSize: '0.9rem', marginBottom: '1rem' }}>{error}</p>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="submit"
          className="btn-primary"
          disabled={submitting}
          style={{ opacity: submitting ? 0.6 : 1 }}
        >
          {submitting
            ? (isEditing ? 'Saving…' : 'Posting…')
            : (isEditing ? 'Save Changes' : 'Post Event')
          }
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => router.back()}
          disabled={submitting}
          style={{ opacity: submitting ? 0.6 : 1 }}
        >
          Cancel
        </button>
        {isEditing && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: '1px solid rgba(192,57,43,0.4)',
              color: 'var(--crimson-bright)',
              padding: '0.5rem 1rem',
              fontFamily: 'var(--font-display)',
              fontSize: '0.6rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            Delete Event
          </button>
        )}
      </div>
    </form>
  );
}
