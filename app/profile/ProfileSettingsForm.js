'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ProfileSettingsForm({ profile, username }) {
  const [isPublic, setIsPublic] = useState(profile?.profile_public !== false);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  // Strip Discord discriminator for display/editing
  const cleanInitial = (username || '').replace(/#.*$/, '');
  const [newUsername,    setNewUsername]    = useState(cleanInitial);
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameSaved,  setUsernameSaved]  = useState(false);
  const [usernameError,  setUsernameError]  = useState('');

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

  async function handleUsernameChange() {
    const trimmed = newUsername.trim();
    if (!trimmed) { setUsernameError('Username cannot be empty.'); return; }
    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(trimmed)) {
      setUsernameError('3–30 characters, letters, numbers, _ and - only.');
      return;
    }
    setUsernameSaving(true);
    setUsernameSaved(false);
    setUsernameError('');
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ username: trimmed })
      .eq('id', profile.id);
    setUsernameSaving(false);
    if (error) {
      setUsernameError(error.message.includes('unique') ? 'That username is already taken.' : error.message);
      return;
    }
    setUsernameSaved(true);
    setTimeout(() => setUsernameSaved(false), 3000);
    // Reload so header and profile link reflect new username
    window.location.reload();
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

  const inputStyle = {
    flex: '1 1 200px',
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${DIM}`,
    borderRadius: '4px',
    padding: '0.5rem 0.75rem',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
  };

  return (
    <>
      {/* ── Username ── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD, marginBottom: '0.75rem' }}>
          Username
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          Your username appears on battle reports, campaign pages, and your public profile URL.
          Changing it will update your profile link — any old links others have saved will no longer work.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={newUsername}
            onChange={e => { setNewUsername(e.target.value); setUsernameError(''); setUsernameSaved(false); }}
            placeholder="your_username"
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = GOLD}
            onBlur={e => e.target.style.borderColor = DIM}
            maxLength={30}
          />
          <button
            type="button"
            className="btn-primary"
            onClick={handleUsernameChange}
            disabled={usernameSaving || newUsername.trim() === cleanInitial}
            style={{ opacity: (usernameSaving || newUsername.trim() === cleanInitial) ? 0.5 : 1, whiteSpace: 'nowrap' }}
          >
            {usernameSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
        {usernameError && <p style={{ fontSize: '0.8rem', color: '#e05a5a', marginTop: '0.5rem' }}>{usernameError}</p>}
        {usernameSaved  && <p style={{ fontSize: '0.8rem', color: GOLD,     marginTop: '0.5rem' }}>✓ Username updated</p>}
        {!usernameError && !usernameSaved && (
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: 1.5 }}>
            Letters, numbers, _ and - only · 3–30 characters
          </p>
        )}
      </section>

      {/* ── Public / Private ── */}
      <section>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD, marginBottom: '0.75rem' }}>
          Public Profile
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          Your public profile at <strong style={{ color: 'var(--text-primary)' }}>battlesphere.cc/players/{cleanInitial || newUsername.trim()}</strong> shows
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
    </>
  );
}
