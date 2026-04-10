'use client';

import { useState } from 'react';

export default function SendOnboardingPage() {
  const [to,          setTo]          = useState('');
  const [inviteLink,  setInviteLink]  = useState('');
  const [status,      setStatus]      = useState(null); // null | 'sending' | 'success' | 'error'
  const [message,     setMessage]     = useState('');

  async function handleSend(e) {
    e.preventDefault();
    setStatus('sending');
    setMessage('');

    try {
      const res  = await fetch('/api/send-onboarding', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ to: to.trim(), inviteLink: inviteLink.trim() }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setStatus('error');
        setMessage(data.error ?? 'Something went wrong.');
      } else {
        setStatus('success');
        setMessage(`Onboarding email sent to ${to.trim()}.`);
        setTo('');
        setInviteLink('');
      }
    } catch {
      setStatus('error');
      setMessage('Network error — please try again.');
    }
  }

  // ── Styles ──────────────────────────────────────────────────────────────────
  const labelStyle = {
    display:       'block',
    fontFamily:    'var(--font-display)',
    fontSize:      '0.6rem',
    fontWeight:    '700',
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color:         'var(--text-secondary)',
    marginBottom:  '0.5rem',
  };

  const inputStyle = {
    width:         '100%',
    background:    'rgba(255,255,255,0.03)',
    border:        '1px solid var(--border)',
    color:         'var(--text-primary)',
    padding:       '0.65rem 0.85rem',
    fontFamily:    'var(--font-body)',
    fontSize:      '0.95rem',
    outline:       'none',
    boxSizing:     'border-box',
  };

  return (
    <div style={{ padding: '2.5rem 2rem', maxWidth: '560px' }}>

      {/* Page title */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          fontFamily:    'var(--font-display)',
          fontSize:      '0.7rem',
          fontWeight:    '700',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color:         'var(--accent)',
          margin:        '0 0 0.4rem',
        }}>
          Send Onboarding Email
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
          Send a personalised welcome email with a campaign invite link to a new tester.
        </p>
      </div>

      {/* Form card */}
      <form
        onSubmit={handleSend}
        style={{
          background:  '#0d0d0f',
          border:      '1px solid var(--border)',
          padding:     '2rem',
          display:     'flex',
          flexDirection: 'column',
          gap:         '1.5rem',
        }}
      >
        {/* Recipient */}
        <div>
          <label htmlFor="to" style={labelStyle}>Recipient Email</label>
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

        {/* Invite link */}
        <div>
          <label htmlFor="inviteLink" style={labelStyle}>Personal Invite Link</label>
          <input
            id="inviteLink"
            type="url"
            required
            value={inviteLink}
            onChange={e => setInviteLink(e.target.value)}
            placeholder="https://www.battlesphere.cc/join/..."
            style={inputStyle}
          />
          <p style={{
            fontSize:   '0.78rem',
            color:      'var(--text-muted)',
            marginTop:  '0.4rem',
            marginBottom: 0,
          }}>
            Generate this link from the Austriacus Subsector campaign admin page.
          </p>
        </div>

        {/* Status message */}
        {status === 'success' && (
          <div style={{
            background:  'rgba(80,160,80,0.08)',
            border:      '1px solid rgba(80,160,80,0.35)',
            color:       '#7ecb7e',
            padding:     '0.75rem 1rem',
            fontSize:    '0.88rem',
          }}>
            ✓ &nbsp; {message}
          </div>
        )}
        {status === 'error' && (
          <div style={{
            background:  'rgba(200,60,60,0.08)',
            border:      '1px solid rgba(200,60,60,0.35)',
            color:       '#e07070',
            padding:     '0.75rem 1rem',
            fontSize:    '0.88rem',
          }}>
            ✗ &nbsp; {message}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={status === 'sending'}
          style={{
            padding:       '0.75rem 2rem',
            background:    'transparent',
            color:         status === 'sending' ? 'var(--text-muted)' : 'var(--accent)',
            border:        `1px solid ${status === 'sending' ? 'var(--border)' : 'var(--accent)'}`,
            fontFamily:    'var(--font-display)',
            fontSize:      '0.65rem',
            fontWeight:    '700',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            cursor:        status === 'sending' ? 'default' : 'pointer',
            alignSelf:     'flex-start',
          }}
        >
          {status === 'sending' ? 'Sending…' : 'Send Email →'}
        </button>
      </form>
    </div>
  );
}
