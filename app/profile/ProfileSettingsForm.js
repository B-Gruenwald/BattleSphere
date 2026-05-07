'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ProfileSettingsForm({ profile, username }) {
  const [isPublic, setIsPublic] = useState(profile?.profile_public !== false);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  async function handleToggle(value) {
    setIsPublic(value);
    setSaving(true);
    setSaved(false);
    const supabase = createClient();
    await supabase
      .from('profiles')
      .update({ profile_public: value })
      .eq('id', profile.id)
      .select();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const DIM  = 'var(--border-dim)';
  const GOLD = 'var(--text-gold)';

  const optStyle = (active) => ({
    flex: 1,
    padding: '0.75rem 1rem',
    border: `1px solid ${active ? 'var(--gold)' : DIM}`,
    background: active ? 'rgba(183,140,64,0.10)' : 'rgba(255,255,255,0.02)',
    color: active ? GOLD : 'var(--text-secondary)',
    cursor: 'pointer',
    fontFamily: 'var(--font-display)',
    fontSize: '0.62rem',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    textAlign: 'center',
    transition: 'all 0.15s',
  });

  return (
    <section>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD, marginBottom: '0.75rem' }}>
        Public Profile
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
        Your public profile at <strong style={{ color: 'var(--text-primary)' }}>battlesphere.cc/players/{username}</strong> shows
        your armies, campaigns, battle history, and achievements — visible to anyone with the link.
        Set it to Private to hide it from everyone else.
      </p>

      <div style={{ display: 'flex', gap: '0', marginBottom: '1rem' }}>
        <button style={optStyle(isPublic)} onClick={() => handleToggle(true)} disabled={saving}>
          Public
        </button>
        <button style={{ ...optStyle(!isPublic), borderLeft: 'none' }} onClick={() => handleToggle(false)} disabled={saving}>
          Private
        </button>
      </div>

      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
        {isPublic
          ? 'Your profile is visible. Usernames on battle reports and army pages will link here.'
          : 'Your profile is hidden. Your username will appear as plain text on battle reports.'}
      </p>

      {saving && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontStyle: 'italic' }}>Saving…</p>
      )}
      {saved && !saving && (
        <p style={{ fontSize: '0.75rem', color: 'var(--gold)', marginTop: '0.5rem' }}>✓ Saved</p>
      )}
    </section>
  );
}
