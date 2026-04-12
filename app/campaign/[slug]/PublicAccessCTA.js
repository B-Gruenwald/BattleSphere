'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * "Request Access" CTA — shown in the public campaign page header.
 *
 * Three states:
 *  1. Already a member     → "Go to Dashboard" (gold btn-primary)
 *  2. Logged in, not member → "Request to Join" button (calls /api/join-request)
 *  3. Not logged in         → email input + submit (calls /api/request-access)
 */
export default function PublicAccessCTA({
  userId,
  isMember,
  campaignId,
  campaignSlug,
  campaignName,
  existingRequest: initialRequest,
}) {
  const [request,   setRequest]   = useState(initialRequest);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [email,     setEmail]     = useState('');
  const [emailSent, setEmailSent] = useState(false);

  // ── 1. Already a member ──────────────────────────────────────────────────────
  if (isMember) {
    return (
      <Link href={`/c/${campaignSlug}`} style={{ textDecoration: 'none' }}>
        <button className="btn-primary nav-log-battle">Go to Dashboard →</button>
      </Link>
    );
  }

  // ── 2. Not logged in — email form ────────────────────────────────────────────
  if (!userId) {
    if (emailSent) {
      return (
        <span style={{
          fontFamily:    'var(--font-display)',
          fontSize:      '0.55rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color:         'var(--text-gold)',
        }}>
          ✓ Invite sent — check your inbox
        </span>
      );
    }

    async function handleEmailSubmit(e) {
      e.preventDefault();
      if (!email.trim()) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/request-access', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ email: email.trim(), campaignId, campaignSlug, campaignName }),
        });
        const json = await res.json();
        if (!res.ok) setError(json.error ?? 'Could not send invite. Please try again.');
        else         setEmailSent(true);
      } catch {
        setError('Could not send invite. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    return (
      <form
        onSubmit={handleEmailSubmit}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}
      >
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          style={{
            background:  'rgba(255,255,255,0.05)',
            border:      '1px solid rgba(183,140,64,0.35)',
            color:       'var(--text-primary)',
            padding:     '0.38rem 0.75rem',
            fontSize:    '0.82rem',
            outline:     'none',
            width:       '180px',
          }}
        />
        <button
          type="submit"
          className="btn-primary nav-log-battle"
          disabled={loading}
          style={{ opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Sending…' : 'Request Access'}
        </button>
        {error && (
          <span style={{ fontSize: '0.75rem', color: 'var(--crimson-bright, #c0392b)' }}>
            {error}
          </span>
        )}
      </form>
    );
  }

  // ── 3a. Logged in — pending ──────────────────────────────────────────────────
  if (request?.status === 'pending') {
    return (
      <span style={{
        fontFamily:    'var(--font-display)',
        fontSize:      '0.55rem',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color:         'var(--text-gold)',
        padding:       '0.38rem 0.85rem',
        border:        '1px solid rgba(183,140,64,0.35)',
      }}>
        ⏳ Request Pending
      </span>
    );
  }

  // ── 3b. Logged in — rejected ─────────────────────────────────────────────────
  if (request?.status === 'rejected') {
    return (
      <span style={{
        fontFamily:    'var(--font-display)',
        fontSize:      '0.55rem',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color:         '#e05a5a',
        padding:       '0.38rem 0.85rem',
        border:        '1px solid rgba(224,90,90,0.35)',
      }}>
        Request Not Approved
      </span>
    );
  }

  // ── 3c. Logged in — no request yet ───────────────────────────────────────────
  async function handleJoinRequest() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/join-request', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ campaignId }),
      });
      const json = await res.json();
      if (!res.ok) setError(json.error ?? 'Could not send request. Please try again.');
      else         setRequest({ status: 'pending' });
    } catch {
      setError('Could not send request. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      {error && <span style={{ fontSize: '0.75rem', color: '#e05a5a' }}>{error}</span>}
      <button
        className="btn-primary nav-log-battle"
        onClick={handleJoinRequest}
        disabled={loading}
        style={{ opacity: loading ? 0.6 : 1 }}
      >
        {loading ? 'Sending…' : 'Request to Join'}
      </button>
    </div>
  );
}
