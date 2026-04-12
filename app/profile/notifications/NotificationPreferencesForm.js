'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const SECTION_TITLE = {
  fontSize: '0.9rem',
  fontWeight: '700',
  color: 'var(--text-primary)',
  letterSpacing: '0.04em',
  marginBottom: '0.25rem',
};

const SECTION_DESC = {
  fontSize: '0.82rem',
  color: 'var(--text-secondary)',
  lineHeight: 1.5,
};

const DIVIDER = {
  height: '1px',
  background: 'var(--border-dim)',
  margin: '1.75rem 0',
};

function Toggle({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: '42px', height: '24px', borderRadius: '12px', flexShrink: 0,
        border: 'none', cursor: 'pointer', position: 'relative',
        background: checked ? 'var(--gold)' : 'var(--border-dim)',
        transition: 'background 0.2s',
      }}
    >
      <span style={{
        position: 'absolute', top: '3px',
        left: checked ? '21px' : '3px',
        width: '18px', height: '18px', borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
      }} />
    </button>
  );
}

export default function NotificationPreferencesForm({ profile, memberships }) {
  const [optinCampaigns, setOptinCampaigns] = useState(profile?.optin_campaign_digests ?? false);
  const [optinPlatform,  setOptinPlatform]  = useState(profile?.optin_platform_news    ?? false);
  const [frequency,      setFrequency]      = useState(profile?.digest_frequency       ?? 'weekly');

  // Per-campaign include_in_digest toggles
  const [campaignToggles, setCampaignToggles] = useState(
    Object.fromEntries(memberships.map(m => [m.id, m.include_in_digest ?? true]))
  );

  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [saveErr, setSaveErr] = useState(null);

  function setCampaignToggle(membershipId, value) {
    setCampaignToggles(prev => ({ ...prev, [membershipId]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setSaveErr(null);
    try {
      const supabase = createClient();

      // Update profile-level preferences
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          optin_platform_news: optinPlatform,
          optin_campaign_digests: optinCampaigns,
          digest_frequency: (optinPlatform || optinCampaigns) ? frequency : null,
        })
        .eq('id', profile.id);
      if (profileErr) throw profileErr;

      // Update per-campaign include_in_digest
      for (const [membershipId, include] of Object.entries(campaignToggles)) {
        await supabase
          .from('campaign_members')
          .update({ include_in_digest: include })
          .eq('id', membershipId);
      }

      // Sync Resend audience for platform newsletter
      try {
        await fetch('/api/newsletter/sync-audience', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ optin: optinPlatform }),
        });
      } catch (_) { /* non-fatal */ }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveErr('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* ── Section: Campaign digests ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <div style={SECTION_TITLE}>Campaign updates</div>
          <div style={SECTION_DESC}>
            Bulletins, current events, and organiser messages from your campaigns. Stay on top of the action between sessions.
          </div>
        </div>
        <Toggle checked={optinCampaigns} onChange={setOptinCampaigns} />
      </div>

      {/* Per-campaign toggles */}
      {optinCampaigns && memberships.length > 0 && (
        <div style={{
          marginTop: '1rem',
          marginLeft: '1rem',
          borderLeft: '2px solid var(--border-dim)',
          paddingLeft: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
        }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.56rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}>
            Include in digest
          </span>
          {memberships.map(m => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {m.campaign?.name ?? 'Campaign'}
              </span>
              <Toggle
                checked={campaignToggles[m.id] ?? true}
                onChange={v => setCampaignToggle(m.id, v)}
              />
            </div>
          ))}
        </div>
      )}

      <div style={DIVIDER} />

      {/* ── Section: Platform news ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <div style={SECTION_TITLE}>BattleSphere news</div>
          <div style={SECTION_DESC}>
            New features and platform updates. Occasional — no noise.
          </div>
        </div>
        <Toggle checked={optinPlatform} onChange={setOptinPlatform} />
      </div>

      <div style={DIVIDER} />

      {/* ── Section: Frequency ── */}
      {(optinCampaigns || optinPlatform) && (
        <>
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={SECTION_TITLE}>Digest frequency</div>
            <div style={SECTION_DESC}>How often would you like to receive your updates?</div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
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
                  fontSize: '0.82rem',
                  border: `1px solid ${frequency === opt.value ? 'var(--gold)' : 'var(--border-dim)'}`,
                  background: frequency === opt.value ? 'rgba(183,140,64,0.1)' : 'transparent',
                  color: frequency === opt.value ? 'var(--text-gold)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── Save button + feedback ── */}
      {saveErr && (
        <p style={{ color: '#e87070', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{saveErr}</p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{ opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Saving…' : 'Save preferences'}
        </button>
        {saved && (
          <span style={{ fontSize: '0.82rem', color: 'var(--text-gold)', fontStyle: 'italic' }}>
            ✓ Saved
          </span>
        )}
      </div>
    </div>
  );
}
