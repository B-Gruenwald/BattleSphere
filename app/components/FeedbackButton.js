'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';

// Maps URL patterns to friendly page names shown in the email
function getPageName(pathname) {
  if (!pathname)                                          return 'Unknown Page';
  if (pathname === '/')                                   return 'Landing Page';
  if (pathname === '/dashboard')                          return 'Dashboard';
  if (pathname.match(/^\/campaign\/new/))                 return 'Create Campaign';
  if (pathname.match(/^\/campaign\//))                    return 'Public Campaign Page';
  if (pathname.match(/^\/c\/[^/]+\/battle\/new/))         return 'Log Battle';
  if (pathname.match(/^\/c\/[^/]+\/battle\/[^/]+\/edit/)) return 'Edit Battle';
  if (pathname.match(/^\/c\/[^/]+\/battle\//))            return 'Battle Detail';
  if (pathname.match(/^\/c\/[^/]+\/battles/))             return 'Battle List';
  if (pathname.match(/^\/c\/[^/]+\/territory\//))         return 'Territory Detail';
  if (pathname.match(/^\/c\/[^/]+\/map/))                 return 'Campaign Map';
  if (pathname.match(/^\/c\/[^/]+\/factions/))            return 'Faction Standings';
  if (pathname.match(/^\/c\/[^/]+\/faction\//))           return 'Faction Detail';
  if (pathname.match(/^\/c\/[^/]+\/players/))             return 'Player List';
  if (pathname.match(/^\/c\/[^/]+\/player\//))            return 'Player Profile';
  if (pathname.match(/^\/c\/[^/]+\/events\/new/))         return 'Post Event';
  if (pathname.match(/^\/c\/[^/]+\/events\/[^/]+\/edit/)) return 'Edit Event';
  if (pathname.match(/^\/c\/[^/]+\/events\//))            return 'Event Detail';
  if (pathname.match(/^\/c\/[^/]+\/events/))              return 'Events List';
  if (pathname.match(/^\/c\/[^/]+\/chronicle/))           return 'Campaign Chronicle';
  if (pathname.match(/^\/c\/[^/]+\/achievements\/new/))   return 'Award Achievement';
  if (pathname.match(/^\/c\/[^/]+\/achievements/))        return 'Hall of Honours';
  if (pathname.match(/^\/c\/[^/]+\/requests/))            return 'Join Requests';
  if (pathname.match(/^\/c\/[^/]+\/admin/))               return 'Campaign Admin';
  if (pathname.match(/^\/c\/[^/]+$/))                     return 'Campaign Dashboard';
  if (pathname.match(/^\/admin\/campaigns\//))            return 'Admin: Campaign Detail';
  if (pathname.match(/^\/admin\/users/))                  return 'Admin: Users';
  if (pathname.match(/^\/admin/))                         return 'Admin Overview';
  return pathname;
}

export default function FeedbackButton({ username }) {
  const pathname = usePathname();

  const [open,        setOpen]        = useState(false);
  const [type,        setType]        = useState('bug');
  const [page,        setPage]        = useState('');
  const [description, setDescription] = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [sent,        setSent]        = useState(false);
  const [error,       setError]       = useState('');

  // Portal requires document — only available client-side after mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  function openModal() {
    setPage(getPageName(pathname));
    setType('bug');
    setDescription('');
    setError('');
    setSent(false);
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please describe the issue or feature.');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/feedback', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type, page, description, username }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unknown error');
      setSent(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = {
    width:      '100%',
    background: 'rgba(255,255,255,0.04)',
    border:     '1px solid var(--border-dim)',
    color:      'var(--text-primary)',
    padding:    '0.65rem 0.9rem',
    fontSize:   '0.9rem',
    outline:    'none',
    boxSizing:  'border-box',
  };

  const labelStyle = {
    display:       'block',
    fontFamily:    'var(--font-display)',
    fontSize:      '0.58rem',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color:         'var(--text-gold)',
    marginBottom:  '0.4rem',
  };

  const typeBtnStyle = (active) => ({
    flex:          1,
    padding:       '0.55rem 0.5rem',
    border:        active ? '1px solid var(--gold)' : '1px solid var(--border-dim)',
    background:    active ? 'rgba(183,140,64,0.12)' : 'rgba(255,255,255,0.02)',
    color:         active ? 'var(--text-gold)' : 'var(--text-secondary)',
    fontFamily:    'var(--font-display)',
    fontSize:      '0.58rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    cursor:        'pointer',
    transition:    'all 0.15s',
  });

  // The modal is rendered via a portal directly into document.body so that
  // the NavBar's backdropFilter CSS doesn't trap the overlay inside the navbar.
  const modal = open && mounted && createPortal(
    <div
      onClick={closeModal}
      style={{
        position:       'fixed',
        top:            0,
        left:           0,
        right:          0,
        bottom:         0,
        zIndex:         9999,
        background:     'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '1rem',
      }}
    >
      {/* Modal panel */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width:      '100%',
          maxWidth:   '480px',
          background: '#0d0d0f',
          border:     '1px solid var(--border-dim)',
          padding:    '2rem',
          position:   'relative',
        }}
      >
        {/* Close button */}
        <button
          onClick={closeModal}
          style={{
            position:   'absolute',
            top:        '1rem',
            right:      '1rem',
            background: 'transparent',
            border:     'none',
            color:      'var(--text-muted)',
            fontSize:   '1.1rem',
            cursor:     'pointer',
            lineHeight: 1,
            padding:    '0.25rem',
          }}
        >
          ✕
        </button>

        {sent ? (
          /* ── Success state ── */
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{
              width: '10px', height: '10px',
              background: 'var(--gold)',
              transform: 'rotate(45deg)',
              margin: '0 auto 1.25rem',
            }} />
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.7rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--text-gold)',
              marginBottom: '0.5rem',
            }}>
              Feedback Sent
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Thank you — your report has been received.
            </p>
            <button className="btn-secondary" onClick={closeModal}>Close</button>
          </div>
        ) : (
          /* ── Form ── */
          <form onSubmit={handleSubmit}>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.58rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--text-gold)',
              marginBottom: '0.4rem',
            }}>
              BattleSphere
            </p>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '0.3rem' }}>
              Send Feedback
            </h2>
            <p style={{
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              marginBottom: '1.75rem',
            }}>
              Report a bug or request a feature. Your message goes directly to the developer.
            </p>

            {/* Type selector */}
            <div style={{ marginBottom: '1.25rem' }}>
              <span style={labelStyle}>Type</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" style={typeBtnStyle(type === 'bug')}
                  onClick={() => setType('bug')}>🐛 Bug Report</button>
                <button type="button" style={typeBtnStyle(type === 'feature')}
                  onClick={() => setType('feature')}>💡 Feature Request</button>
              </div>
            </div>

            {/* Page (pre-filled) */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle} htmlFor="fb-page">Page</label>
              <input
                id="fb-page"
                type="text"
                value={page}
                onChange={e => setPage(e.target.value)}
                style={inputStyle}
                placeholder="Which page is this about?"
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle} htmlFor="fb-desc">
                {type === 'bug' ? 'What happened?' : 'What would you like?'}
              </label>
              <textarea
                id="fb-desc"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={5}
                placeholder={
                  type === 'bug'
                    ? 'Describe what you did, what you expected, and what actually happened…'
                    : 'Describe the feature you have in mind and why it would be useful…'
                }
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
              />
            </div>

            {error && (
              <p style={{ color: '#e05a5a', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {error}
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
                style={{ opacity: submitting ? 0.6 : 1 }}
              >
                {submitting ? 'Sending…' : 'Send Feedback'}
              </button>
              <button type="button" className="btn-secondary" onClick={closeModal}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={openModal}
        style={{
          background:    'transparent',
          border:        '1px solid rgba(183,140,64,0.35)',
          color:         'var(--text-gold)',
          fontFamily:    'var(--font-display)',
          fontSize:      '0.55rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          padding:       '0.3rem 0.75rem',
          cursor:        'pointer',
          transition:    'all 0.15s',
        }}
      >
        Feedback
      </button>

      {modal}
    </>
  );
}
