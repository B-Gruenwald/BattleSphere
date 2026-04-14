'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

const OVERLAY = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.72)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 9000,
  padding: '1rem',
};

const PANEL = {
  background: 'var(--surface)',
  border: '1px solid var(--border-dim)',
  maxWidth: '480px',
  width: '100%',
  padding: '2.5rem 2.25rem 2rem',
  position: 'relative',
};

const LABEL_STYLE = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.58rem',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--text-gold)',
  display: 'block',
  marginBottom: '0.6rem',
};

const TOGGLE_ROW = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.85rem',
  padding: '1rem',
  border: '1px solid var(--border-dim)',
  cursor: 'pointer',
  transition: 'border-color 0.15s',
  marginBottom: '0.65rem',
};

function ToggleRow({ checked, onChange, title, description }) {
  return (
    <div
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      style={{ ...TOGGLE_ROW, borderColor: checked ? 'rgba(183,140,64,0.5)' : 'var(--border-dim)' }}
      onClick={() => onChange(!checked)}
      onKeyDown={e => (e.key === ' ' || e.key === 'Enter') && onChange(!checked)}
    >
      {/* Checkbox indicator */}
      <div style={{
        width: '18px', height: '18px', flexShrink: 0, marginTop: '1px',
        border: `2px solid ${checked ? 'var(--gold)' : 'var(--border-dim)'}`,
        background: checked ? 'var(--gold)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}>
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="#07070a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <div>
        <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
          {title}
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {description}
        </div>
      </div>
    </div>
  );
}

export default function NewsletterOptinModal() {
  const [show, setShow]                     = useState(false);
  const [userId, setUserId]                 = useState(null);
  const [optinCampaigns, setOptinCampaigns] = useState(true);
  const [optinPlatform, setOptinPlatform]   = useState(true);
  const [frequency, setFrequency]           = useState('weekly');
  const [saving, setSaving]                 = useState(false);
  const [declined, setDeclined]             = useState(false);

  useEffect(() => {
    async function check() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: rows } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .limit(1);

      const profile = rows?.[0] ?? null;
      if (!profile) return;

      // Only show if either optin has never been answered (null or undefined)
      if (profile.optin_platform_news == null || profile.optin_campaign_digests == null) {
        setUserId(user.id);
        // Pre-fill from any existing partial answers
        if (profile.optin_campaign_digests != null) setOptinCampaigns(profile.optin_campaign_digests);
        if (profile.optin_platform_news != null) setOptinPlatform(profile.optin_platform_news);
        if (profile.digest_frequency) setFrequency(profile.digest_frequency);
        setShow(true);
      }
    }
    check();
  }, []);

  async function handleSave() {
    if (!userId) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from('profiles').update({
      optin_platform_news: optinPlatform,
      optin_campaign_digests: optinCampaigns,
      digest_frequency: (optinPlatform || optinCampaigns) ? frequency : null,
    }).eq('id', userId);

    // Sync Resend audience if platform news changed
    try {
      await fetch('/api/newsletter/sync-audience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optin: optinPlatform }),
      });
    } catch (_) { /* non-fatal */ }

    setSaving(false);
    setShow(false);
  }

  async function handleDecline() {
    if (!userId) return;
    const supabase = createClient();
    await supabase.from('profiles').update({
      optin_platform_news: false,
      optin_campaign_digests: false,
    }).eq('id', userId);

    try {
      await fetch('/api/newsletter/sync-audience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optin: false }),
      });
    } catch (_) { /* non-fatal */ }

    setDeclined(true);
    // Close after a moment so user can read the note
    setTimeout(() => setShow(false), 4500);
  }

  if (!show) return null;

  return (
    <div style={OVERLAY} onClick={e => e.target === e.currentTarget && null /* no dismiss on overlay click */}>
      <div style={PANEL}>

        {/* Gold diamond ornament */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', opacity: 0.5 }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--gold)' }} />
          <div style={{ width: '5px', height: '5px', background: 'var(--gold)', transform: 'rotate(45deg)' }} />
          <div style={{ flex: 1, height: '1px', background: 'var(--gold)' }} />
        </div>

        {declined ? (
          /* ── Declined state ── */
          <div style={{ textAlign: 'center', padding: '0.5rem 0 1rem' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              No problem. You can always turn updates on later in your{' '}
              <a href="/profile/notifications" style={{ color: 'var(--text-gold)', textDecoration: 'none', borderBottom: '1px solid rgba(183,140,64,0.35)' }}>
                notification settings
              </a>.
            </p>
          </div>
        ) : (
          <>
            {/* ── Headline ── */}
            <span style={LABEL_STYLE}>Stay in the fight</span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', letterSpacing: '0.04em', marginBottom: '0.6rem' }}>
              Never miss a dispatch
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.75rem' }}>
              Get campaign bulletins, events, and messages from your commanders delivered to your inbox —
              so you always know what's happening between sessions.
            </p>

            {/* ── Opt-in toggles ── */}
            <ToggleRow
              checked={optinCampaigns}
              onChange={setOptinCampaigns}
              title="Campaign updates"
              description="Bulletins, current events, and messages from your campaign organiser."
            />
            <ToggleRow
              checked={optinPlatform}
              onChange={setOptinPlatform}
              title="BattleSphere news"
              description="New features and platform updates. Occasional — no noise."
            />

            {/* ── Frequency selector (shown when either optin is on) ── */}
            {(optinCampaigns || optinPlatform) && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ ...LABEL_STYLE, marginBottom: '0.5rem' }}>Send me updates</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {[
                    { value: 'weekly',      label: 'Weekly' },
                    { value: 'fortnightly', label: 'Every two weeks' },
                    { value: 'monthly',     label: 'Monthly' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setFrequency(opt.value)}
                      style={{
                        padding: '0.4rem 0.85rem',
                        fontSize: '0.8rem',
                        border: `1px solid ${frequency === opt.value ? 'var(--gold)' : 'var(--border-dim)'}`,
                        background: frequency === opt.value ? 'rgba(183,140,64,0.1)' : 'transparent',
                        color: frequency === opt.value ? 'var(--text-gold)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Actions ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving || (!optinCampaigns && !optinPlatform)}
                style={{ flex: 1, minWidth: '140px', opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Saving…' : 'Save preferences'}
              </button>
              <button
                onClick={handleDecline}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '0.82rem', color: 'var(--text-muted)',
                  padding: '0.5rem 0',
                  textDecoration: 'underline', textUnderlineOffset: '3px',
                }}
              >
                Not now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
