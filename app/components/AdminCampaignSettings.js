'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const SETTINGS = ['Gothic Sci-Fi', 'Space Opera', 'High Fantasy', 'Historical', 'Custom'];

export default function AdminCampaignSettings({ campaign, slug }) {
  const supabase = createClient();

  const [name,        setName]        = useState(campaign.name || '');
  const [description, setDescription] = useState(campaign.description || '');
  const [setting,     setSetting]     = useState(campaign.setting || 'Custom');
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [error,       setError]       = useState('');

  const dirty = name !== campaign.name
    || description !== (campaign.description || '')
    || setting !== campaign.setting;

  async function save() {
    if (!name.trim()) { setError('Campaign name cannot be empty.'); return; }
    setSaving(true);
    setSaved(false);
    setError('');

    const { error: err } = await supabase
      .from('campaigns')
      .update({
        name:        name.trim(),
        description: description.trim() || null,
        setting,
      })
      .eq('id', campaign.id);

    setSaving(false);
    if (err) {
      setError(err.message);
    } else {
      setSaved(true);
    }
  }

  const inputStyle = {
    width: '100%',
    background: 'var(--surface-2)',
    border: '1px solid var(--border-dim)',
    color: 'var(--text-primary)',
    padding: '0.65rem 0.9rem',
    fontSize: '0.95rem',
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
    marginBottom: '0.35rem',
  };

  return (
    <div style={{ border: '1px solid var(--border-dim)', padding: '2rem' }}>
      {/* Name */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>Campaign Name *</label>
        <input
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setSaved(false); }}
          style={inputStyle}
          placeholder="My Campaign"
        />
      </div>

      {/* Description */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>Description</label>
        <textarea
          value={description}
          onChange={e => { setDescription(e.target.value); setSaved(false); }}
          rows={3}
          placeholder="What is this campaign about?"
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
        />
      </div>

      {/* Setting */}
      <div style={{ marginBottom: '1.75rem' }}>
        <label style={labelStyle}>Genre Setting</label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {SETTINGS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => { setSetting(s); setSaved(false); }}
              style={{
                padding: '0.5rem 0.9rem',
                cursor: 'pointer',
                border: `1px solid ${setting === s ? 'var(--gold)' : 'var(--border-dim)'}`,
                background: setting === s ? 'rgba(183,140,64,0.12)' : 'rgba(255,255,255,0.02)',
                color: setting === s ? 'var(--text-gold)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-display)',
                fontSize: '0.58rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                transition: 'all 0.15s',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          type="button"
          className="btn-primary"
          onClick={save}
          disabled={saving || !dirty}
          style={{ opacity: (saving || !dirty) ? 0.5 : 1 }}
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
        {saved && (
          <span style={{ color: 'var(--text-gold)', fontSize: '0.8rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            ✓ Saved
          </span>
        )}
        {error && (
          <span style={{ color: '#e05a5a', fontSize: '0.82rem' }}>{error}</span>
        )}
      </div>
    </div>
  );
}
