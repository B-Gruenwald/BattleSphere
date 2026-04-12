'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

/**
 * Shown in the global nav bar when the user is on a /campaign/[slug] page.
 * Fetches its own membership state client-side so the server layout stays simple.
 *
 * States: loading → member | pending | rejected | can-request | email-form
 */
export default function PublicCampaignNavCTA({ slug }) {
  const [status,       setStatus]       = useState('loading');
  const [campaignId,   setCampaignId]   = useState(null);
  const [campaignName, setCampaignName] = useState(null);
  const [open,         setOpen]         = useState(false);
  const [email,        setEmail]        = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [done,         setDone]         = useState(false);
  const [error,        setError]        = useState(null);
  const wrapRef = useRef(null);

  // ── Fetch campaign + membership status ──────────────────────────────────────
  useEffect(() => {
    if (!slug) return;
    async function fetchStatus() {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();

      const { data: campaign } = await supabase
        .from('campaigns').select('id, name').eq('slug', slug).single();
      if (!campaign) return;
      setCampaignId(campaign.id);
      setCampaignName(campaign.name);

      if (!user) { setStatus('email-form'); return; }

      const { data: membership } = await supabase
        .from('campaign_members').select('user_id')
        .eq('campaign_id', campaign.id).eq('user_id', user.id).limit(1);
      if (membership?.[0]) { setStatus('member'); return; }

      const { data: reqData } = await supabase
        .from('join_requests').select('status')
        .eq('campaign_id', campaign.id).eq('user_id', user.id).limit(1);
      const req = reqData?.[0];
      if (req?.status === 'pending')  { setStatus('pending');     return; }
      if (req?.status === 'rejected') { setStatus('rejected');    return; }
      setStatus('can-request');
    }
    fetchStatus();
  }, [slug]);

  // ── Close dropdown on outside click ─────────────────────────────────────────
  useEffect(() => {
    function onOutsideClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, []);

  // ── Nothing to show while loading or after rejection ────────────────────────
  if (status === 'loading' || status === 'rejected') return null;

  // ── Already a member — "Campaign Dashboard" button ──────────────────────────
  if (status === 'member') {
    return (
      <Link href={`/c/${slug}`} style={{ textDecoration: 'none' }}>
        <button className="btn-primary nav-log-battle">Campaign Dashboard →</button>
      </Link>
    );
  }

  // ── Pending — badge ──────────────────────────────────────────────────────────
  if (status === 'pending') {
    return (
      <span style={{
        fontFamily:    'var(--font-display)',
        fontSize:      '0.55rem',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color:         'var(--text-gold)',
        opacity:       0.8,
      }}>
        ⏳ Request Pending
      </span>
    );
  }

  // ── Not logged in — button + dropdown email form ─────────────────────────────
  if (status === 'email-form') {
    if (done) {
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
      setSubmitting(true);
      setError(null);
      try {
        const res = await fetch('/api/request-access', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            email:        email.trim(),
            campaignId,
            campaignSlug: slug,
            campaignName,
          }),
        });
        const json = await res.json();
        if (!res.ok) setError(json.error ?? 'Could not send. Try again.');
        else         { setDone(true); setOpen(false); }
      } catch {
        setError('Could not send. Try again.');
      } finally {
        setSubmitting(false);
      }
    }

    return (
      <div ref={wrapRef} style={{ position: 'relative' }}>
        <button
          className="btn-primary nav-log-battle"
          onClick={() => setOpen(o => !o)}
        >
          Request Access
        </button>

        {open && (
          <div style={{
            position:    'absolute',
            top:         'calc(100% + 0.6rem)',
            left:        0,
            zIndex:      200,
            minWidth:    '260px',
            background:  'rgba(10,10,15,0.98)',
            border:      '1px solid rgba(183,140,64,0.3)',
            backdropFilter: 'blur(12px)',
            padding:     '1rem 1.1rem',
            boxShadow:   '0 8px 32px rgba(0,0,0,0.55)',
          }}>
            <p style={{
              fontFamily:    'var(--font-display)',
              fontSize:      '0.52rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color:         'var(--text-gold)',
              marginBottom:  '0.75rem',
            }}>
              Get an invite link by email
            </p>
            <form
              onSubmit={handleEmailSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
            >
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border:     '1px solid rgba(183,140,64,0.35)',
                  color:      'var(--text-primary)',
                  padding:    '0.4rem 0.65rem',
                  fontSize:   '0.82rem',
                  outline:    'none',
                  width:      '100%',
                  boxSizing:  'border-box',
                }}
              />
              <button
                type="submit"
                className="btn-primary nav-log-battle"
                disabled={submitting}
                style={{ opacity: submitting ? 0.6 : 1, width: '100%' }}
              >
                {submitting ? 'Sending…' : 'Send Invite Link'}
              </button>
              {error && (
                <span style={{ fontSize: '0.75rem', color: '#e05a5a' }}>{error}</span>
              )}
            </form>
            <p style={{
              fontSize:    '0.78rem',
              color:       'var(--text-muted)',
              marginTop:   '0.65rem',
              fontStyle:   'italic',
              lineHeight:  1.5,
            }}>
              We'll send you a registration link and a campaign invite.
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── Logged in, no request yet — direct "Request to Join" button ──────────────
  async function handleJoinRequest() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/join-request', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ campaignId }),
      });
      const json = await res.json();
      if (!res.ok) setError(json.error ?? 'Could not send request. Please try again.');
      else         setStatus('pending');
    } catch {
      setError('Could not send request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <button
        className="btn-primary nav-log-battle"
        onClick={handleJoinRequest}
        disabled={submitting}
        style={{ opacity: submitting ? 0.6 : 1 }}
      >
        {submitting ? 'Sending…' : 'Request to Join'}
      </button>
      {error && (
        <span style={{ fontSize: '0.72rem', color: '#e05a5a' }}>{error}</span>
      )}
    </div>
  );
}
