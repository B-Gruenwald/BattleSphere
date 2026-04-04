'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const PRESET_ICONS = [
  '🏆', '🥇', '⚔️', '🛡️', '👑', '💀', '🔥', '🗡️',
  '⭐', '🎖️', '🌟', '🦁', '🐉', '☠️', '🎯', '⚡',
];

const PRESET_ACHIEVEMENTS = [
  { title: 'First Blood',       description: 'Drew first blood in the campaign.' },
  { title: 'Conqueror',         description: 'Seized control of a key territory.' },
  { title: 'Iron Will',         description: 'Fought on against overwhelming odds.' },
  { title: 'Warlord',           description: 'Commanded their forces to decisive victory.' },
  { title: 'Unbroken',          description: 'Remained undefeated throughout the campaign.' },
  { title: 'Master Tactician',  description: 'Outmanoeuvred the enemy at every turn.' },
  { title: 'Legendary Warrior', description: 'Performed extraordinary feats on the battlefield.' },
  { title: 'Defender of the Realm', description: 'Held the line against relentless assault.' },
];

const inputStyle = {
  width: '100%',
  background: 'var(--bg-raised)',
  border: '1px solid var(--border-subtle)',
  color: 'var(--text-primary)',
  padding: '0.65rem 0.85rem',
  fontFamily: 'var(--font-body)',
  fontSize: '0.95rem',
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

export default function AchievementForm({ campaign, factions, members, memberProfiles }) {
  const router = useRouter();
  const supabase = createClient();

  const [title,         setTitle]         = useState('');
  const [description,   setDescription]   = useState('');
  const [icon,          setIcon]          = useState('🏆');
  const [customIcon,    setCustomIcon]    = useState('');
  const [recipientType, setRecipientType] = useState('player');  // 'player' | 'faction'
  const [playerId,      setPlayerId]      = useState('');
  const [factionId,     setFactionId]     = useState('');
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState('');

  const activeIcon = customIcon.trim() || icon;

  function applyPreset(preset) {
    setTitle(preset.title);
    setDescription(preset.description);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required.'); return; }
    if (recipientType === 'player' && !playerId) { setError('Select a player to receive this achievement.'); return; }
    if (recipientType === 'faction' && !factionId) { setError('Select a faction to receive this achievement.'); return; }

    setSubmitting(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('You must be logged in to award achievements.'); setSubmitting(false); return; }

    const payload = {
      campaign_id:           campaign.id,
      title:                 title.trim(),
      description:           description.trim() || null,
      icon:                  activeIcon,
      awarded_by:            user.id,
      awarded_to_type:       recipientType,
      awarded_to_player_id:  recipientType === 'player'  ? playerId  : null,
      awarded_to_faction_id: recipientType === 'faction' ? factionId : null,
    };

    const { error: err } = await supabase.from('achievements').insert(payload);
    if (err) {
      setError(err.message);
      setSubmitting(false);
      return;
    }

    router.push(`/c/${campaign.slug}/achievements`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '680px' }}>

      {/* Quick presets */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Quick Presets</label>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
          Click to fill title and description instantly.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {PRESET_ACHIEVEMENTS.map(p => (
            <button
              key={p.title}
              type="button"
              onClick={() => applyPreset(p)}
              style={{
                padding: '0.35rem 0.75rem',
                background: title === p.title ? 'rgba(183,140,64,0.12)' : 'var(--bg-raised)',
                border: `1px solid ${title === p.title ? 'rgba(183,140,64,0.5)' : 'var(--border-subtle)'}`,
                color: title === p.title ? 'var(--text-gold)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-display)',
                fontSize: '0.56rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {p.title}
            </button>
          ))}
        </div>
      </div>

      {/* Icon picker */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Icon</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
          {PRESET_ICONS.map(em => (
            <button
              key={em}
              type="button"
              onClick={() => { setIcon(em); setCustomIcon(''); }}
              style={{
                width: '38px', height: '38px',
                fontSize: '1.2rem',
                background: icon === em && !customIcon ? 'rgba(183,140,64,0.15)' : 'var(--bg-raised)',
                border: `1px solid ${icon === em && !customIcon ? 'rgba(183,140,64,0.5)' : 'var(--border-subtle)'}`,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              {em}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <input
            type="text"
            value={customIcon}
            onChange={e => setCustomIcon(e.target.value)}
            placeholder="Or type your own emoji…"
            maxLength={4}
            style={{ ...inputStyle, width: '200px' }}
          />
          {activeIcon && (
            <span style={{ fontSize: '2rem' }}>{activeIcon}</span>
          )}
        </div>
      </div>

      {/* Title */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Achievement Title *</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. First Blood, Conqueror, Iron Will…"
          style={inputStyle}
          required
        />
      </div>

      {/* Description */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What did they do to earn this?"
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
        />
      </div>

      {/* Recipient type */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Award To</label>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          {[{ value: 'player', label: 'Player' }, { value: 'faction', label: 'Faction' }].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setRecipientType(opt.value); setPlayerId(''); setFactionId(''); }}
              style={{
                padding: '0.45rem 1.25rem',
                background: recipientType === opt.value ? 'rgba(183,140,64,0.12)' : 'var(--bg-raised)',
                border: `1px solid ${recipientType === opt.value ? 'rgba(183,140,64,0.5)' : 'var(--border-subtle)'}`,
                color: recipientType === opt.value ? 'var(--text-gold)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-display)',
                fontSize: '0.6rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {recipientType === 'player' && (
          <div>
            <label style={{ ...labelStyle, color: 'var(--text-secondary)' }}>Select Player *</label>
            <select
              value={playerId}
              onChange={e => setPlayerId(e.target.value)}
              style={inputStyle}
              required
            >
              <option value="">— Choose a player —</option>
              {(memberProfiles || []).map(p => (
                <option key={p.id} value={p.id}>{p.username}</option>
              ))}
            </select>
          </div>
        )}

        {recipientType === 'faction' && (
          <div>
            <label style={{ ...labelStyle, color: 'var(--text-secondary)' }}>Select Faction *</label>
            <select
              value={factionId}
              onChange={e => setFactionId(e.target.value)}
              style={inputStyle}
              required
            >
              <option value="">— Choose a faction —</option>
              {(factions || []).map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Preview */}
      {title && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1.25rem 1.5rem',
          background: 'var(--bg-deep)',
          border: '1px solid rgba(183,140,64,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <span style={{ fontSize: '2rem', flexShrink: 0 }}>{activeIcon}</span>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.2rem' }}>
              Preview
            </div>
            <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>{title}</div>
            {description && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '0.2rem' }}>{description}</div>
            )}
          </div>
        </div>
      )}

      {error && (
        <p style={{ color: 'var(--crimson-bright)', fontSize: '0.9rem', marginBottom: '1rem' }}>{error}</p>
      )}

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          type="submit"
          className="btn-primary"
          disabled={submitting}
          style={{ opacity: submitting ? 0.6 : 1 }}
        >
          {submitting ? 'Awarding…' : 'Award Achievement'}
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
      </div>
    </form>
  );
}
