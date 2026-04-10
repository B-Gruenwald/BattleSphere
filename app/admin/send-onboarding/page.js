'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

const APP_URL = typeof window !== 'undefined'
  ? window.location.origin
  : 'https://www.battlesphere.cc';

const CAMPAIGN_NAME_PATTERN = '%Austriacus%';
const CAMPAIGN_PUBLIC_URL   = 'https://www.battlesphere.cc/campaign/austriacus-subsector-93n4g';

function generateCode(length = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function formatExpiry(expiresAt) {
  const d    = new Date(expiresAt);
  const now  = new Date();
  const diff = d - now;
  if (diff < 0) return 'Expired';
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days === 1) return 'Expires tomorrow';
  return `Expires in ${days} days`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SendOnboardingPage() {
  const supabase = createClient();

  const [campaignId,     setCampaignId]     = useState(null);
  const [campaignError,  setCampaignError]  = useState('');

  const [to,             setTo]             = useState('');
  const [firstName,      setFirstName]      = useState('');
  const [inviteCode,     setInviteCode]     = useState(null);   // the generated code row
  const [generating,     setGenerating]     = useState(false);
  const [inviteError,    setInviteError]    = useState('');
  const [revoking,       setRevoking]       = useState(false);
  const [copied,         setCopied]         = useState(false);

  const [sending,        setSending]        = useState(false);
  const [sendStatus,     setSendStatus]     = useState(null);   // null | 'success' | 'error'
  const [sendMessage,    setSendMessage]    = useState('');

  // ── On mount: resolve the Austriacus Subsector campaign ID ─────────────────
  useEffect(() => {
    async function fetchCampaign() {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name')
        .ilike('name', CAMPAIGN_NAME_PATTERN)
        .limit(1)
        .single();
      if (error || !data) {
        setCampaignError('Could not find the Austriacus Subsector campaign in the database.');
      } else {
        setCampaignId(data.id);
      }
    }
    fetchCampaign();
  }, []);

  // ── Generate invite link ────────────────────────────────────────────────────
  async function generateInviteLink() {
    if (!campaignId) return;
    setGenerating(true);
    setInviteError('');
    const code = generateCode(10);
    const { data: saved, error } = await supabase
      .from('campaign_invite_codes')
      .insert({ campaign_id: campaignId, code })
      .select()
      .single();
    setGenerating(false);
    if (error) {
      setInviteError('Could not create invite link: ' + error.message);
      return;
    }
    setInviteCode(saved);
  }

  // ── Revoke generated link (so user can start fresh) ─────────────────────────
  async function revokeInviteLink() {
    if (!inviteCode) return;
    setRevoking(true);
    await supabase.from('campaign_invite_codes').delete().eq('id', inviteCode.id);
    setRevoking(false);
    setInviteCode(null);
    setInviteError('');
  }

  // ── Copy invite link to clipboard ───────────────────────────────────────────
  async function copyLink() {
    if (!inviteCode) return;
    const url = `${APP_URL}/join/${inviteCode.code}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  // ── Send email ──────────────────────────────────────────────────────────────
  async function handleSend(e) {
    e.preventDefault();
    if (!to.trim() || !inviteCode) return;
    setSending(true);
    setSendStatus(null);
    setSendMessage('');

    const inviteLink = `${APP_URL}/join/${inviteCode.code}`;

    try {
      const res  = await fetch('/api/send-onboarding', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ to: to.trim(), firstName: firstName.trim() || null, inviteLink }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setSendStatus('error');
        setSendMessage(data.error ?? 'Something went wrong.');
      } else {
        setSendStatus('success');
        setSendMessage(`Email sent to ${to.trim()}.`);
        // Reset for next send
        setTo('');
        setFirstName('');
        setInviteCode(null);
      }
    } catch {
      setSendStatus('error');
      setSendMessage('Network error — please try again.');
    } finally {
      setSending(false);
    }
  }

  // ── Styles ──────────────────────────────────────────────────────────────────
  const labelStyle = {
    display:       'block',
    fontFamily:    'var(--font-display)',
    fontSize:      '0.58rem',
    fontWeight:    '700',
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color:         'var(--text-secondary)',
    marginBottom:  '0.5rem',
  };

  const inputStyle = {
    width:       '100%',
    background:  'rgba(255,255,255,0.03)',
    border:      '1px solid var(--border)',
    color:       'var(--text-primary)',
    padding:     '0.65rem 0.85rem',
    fontFamily:  'var(--font-body)',
    fontSize:    '0.95rem',
    outline:     'none',
    boxSizing:   'border-box',
  };

  const inviteLink = inviteCode ? `${APP_URL}/join/${inviteCode.code}` : null;
  const canSend    = !!to.trim() && !!inviteCode && !sending;

  return (
    <div style={{ padding: '2.5rem 2rem', maxWidth: '580px' }}>

      {/* Page title */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          fontFamily:    'var(--font-display)',
          fontSize:      '0.68rem',
          fontWeight:    '700',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color:         'var(--accent)',
          margin:        '0 0 0.4rem',
        }}>
          Send Onboarding Email
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
          Generate a personal invite link and send the welcome email in one step.
          Each recipient gets their own unique link.
        </p>
      </div>

      {/* Campaign load error */}
      {campaignError && (
        <div style={{ background: 'rgba(200,60,60,0.08)', border: '1px solid rgba(200,60,60,0.35)', color: '#e07070', padding: '0.75rem 1rem', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
          ✗ &nbsp; {campaignError}
        </div>
      )}

      <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* ── Step 1: Recipient ───────────────────────────────────────────────── */}
        <div style={{ background: '#0d0d0f', border: '1px solid var(--border)', padding: '1.75rem' }}>
          <p style={{ ...labelStyle, color: 'var(--accent)', marginBottom: '1.2rem' }}>
            Step 1 — Recipient
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="to" style={labelStyle}>Email Address</label>
              <input
                id="to"
                type="email"
                required
                value={to}
                onChange={e => setTo(e.target.value)}
                placeholder="tester@example.com"
                style={inputStyle}
              />
            </div>
            <div style={{ flex: '0 0 180px' }}>
              <label htmlFor="firstName" style={labelStyle}>
                First Name <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Sarah"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* ── Step 2: Invite Link ─────────────────────────────────────────────── */}
        <div style={{ background: '#0d0d0f', border: '1px solid var(--border)', padding: '1.75rem' }}>
          <p style={{ ...labelStyle, color: 'var(--accent)', marginBottom: '0.4rem' }}>
            Step 2 — Invite Link
          </p>
          <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
            Links expire in 7 days. Generate one per recipient — each link is unique.
          </p>

          {inviteError && (
            <p style={{ color: '#e05a5a', fontSize: '0.85rem', marginBottom: '1rem' }}>{inviteError}</p>
          )}

          {!inviteCode ? (
            /* Generate button */
            <button
              type="button"
              onClick={generateInviteLink}
              disabled={generating || !campaignId}
              style={{
                padding:       '0.7rem 1.5rem',
                background:    'transparent',
                color:         (generating || !campaignId) ? 'var(--text-muted)' : 'var(--accent)',
                border:        `1px solid ${(generating || !campaignId) ? 'var(--border)' : 'var(--accent)'}`,
                fontFamily:    'var(--font-display)',
                fontSize:      '0.62rem',
                fontWeight:    '700',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                cursor:        (generating || !campaignId) ? 'default' : 'pointer',
              }}
            >
              {generating ? 'Generating…' : !campaignId && !campaignError ? 'Loading…' : '+ Generate Invite Link'}
            </button>
          ) : (
            /* Generated link card */
            <div style={{ background: 'rgba(183,140,64,0.04)', border: '1px solid rgba(183,140,64,0.22)', padding: '1rem 1.1rem' }}>
              {/* Expiry + Revoke */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{
                  fontFamily:    'var(--font-display)',
                  fontSize:      '0.52rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color:         'var(--accent)',
                }}>
                  ✓ &nbsp; {formatExpiry(inviteCode.expires_at)}
                </span>
                <button
                  type="button"
                  onClick={revokeInviteLink}
                  disabled={revoking}
                  style={{ background: 'none', border: 'none', color: '#e05a5a', cursor: revoking ? 'not-allowed' : 'pointer', fontSize: '0.78rem', opacity: revoking ? 0.6 : 1, padding: 0 }}
                >
                  {revoking ? 'Revoking…' : 'Revoke & start over'}
                </button>
              </div>

              {/* Link + Copy */}
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <input
                  readOnly
                  value={inviteLink}
                  style={{ ...inputStyle, flex: 1, color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'text', padding: '0.45rem 0.75rem', minWidth: 0 }}
                  onFocus={e => e.target.select()}
                />
                <button
                  type="button"
                  onClick={copyLink}
                  style={{
                    padding:       '0.45rem 1rem',
                    background:    'transparent',
                    color:         copied ? '#7ecb7e' : 'var(--text-secondary)',
                    border:        `1px solid ${copied ? '#7ecb7e' : 'var(--border)'}`,
                    fontFamily:    'var(--font-display)',
                    fontSize:      '0.58rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    cursor:        'pointer',
                    whiteSpace:    'nowrap',
                    flexShrink:    0,
                  }}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>

              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.6rem 0 0', lineHeight: 1.5 }}>
                This link will be embedded in the email automatically — no copy-paste needed.
              </p>
            </div>
          )}
        </div>

        {/* ── Send ───────────────────────────────────────────────────────────── */}
        <div>
          {/* Status messages */}
          {sendStatus === 'success' && (
            <div style={{ background: 'rgba(80,160,80,0.08)', border: '1px solid rgba(80,160,80,0.35)', color: '#7ecb7e', padding: '0.75rem 1rem', fontSize: '0.88rem', marginBottom: '1rem' }}>
              ✓ &nbsp; {sendMessage}
            </div>
          )}
          {sendStatus === 'error' && (
            <div style={{ background: 'rgba(200,60,60,0.08)', border: '1px solid rgba(200,60,60,0.35)', color: '#e07070', padding: '0.75rem 1rem', fontSize: '0.88rem', marginBottom: '1rem' }}>
              ✗ &nbsp; {sendMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSend}
            style={{
              padding:       '0.8rem 2.5rem',
              background:    canSend ? 'var(--accent)' : 'transparent',
              color:         canSend ? '#07070a' : 'var(--text-muted)',
              border:        `1px solid ${canSend ? 'var(--accent)' : 'var(--border)'}`,
              fontFamily:    'var(--font-display)',
              fontSize:      '0.65rem',
              fontWeight:    '700',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              cursor:        canSend ? 'pointer' : 'default',
            }}
          >
            {sending ? 'Sending…' : 'Send Onboarding Email →'}
          </button>

          {!inviteCode && !sending && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.6rem' }}>
              Generate an invite link above to unlock send.
            </p>
          )}
        </div>

      </form>
    </div>
  );
}
