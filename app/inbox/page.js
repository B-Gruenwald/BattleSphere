'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { NOTIF_CONFIG } from '@/app/lib/notifications';

function timeAgo(dateStr) {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins} min ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const PAGE_SIZE = 20;

export default function InboxPage() {
  const [notifs,  setNotifs]  = useState([]);
  const [unread,  setUnread]  = useState(0);
  const [offset,  setOffset]  = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [filter,  setFilter]  = useState('all');

  const fetchPage = useCallback(async (pageOffset, replace = false) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/notifications?limit=${PAGE_SIZE + 1}&offset=${pageOffset}`);
      if (!res.ok) return;
      const data = await res.json();
      const items = data.notifications ?? [];
      const more  = items.length > PAGE_SIZE;
      setNotifs(prev => replace ? items.slice(0, PAGE_SIZE) : [...prev, ...items.slice(0, PAGE_SIZE)]);
      setUnread(data.unreadCount ?? 0);
      setHasMore(more);
      setOffset(pageOffset + PAGE_SIZE);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchPage(0, true); }, [fetchPage]);

  async function markAllRead() {
    if (!unread || marking) return;
    setMarking(true);
    try {
      await fetch('/api/notifications', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnread(0);
    } catch {}
    setMarking(false);
  }

  async function markOneRead(e, notif) {
    e.preventDefault();
    e.stopPropagation();
    if (notif.is_read) return;
    fetch('/api/notifications', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [notif.id] }),
    }).catch(() => {});
    setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
  }

  const displayed = filter === 'unread' ? notifs.filter(n => !n.is_read) : notifs;
  const cfg = (type) => NOTIF_CONFIG[type] ?? { icon: '🔔', colour: '#a09880', label: 'Notification' };

  return (
    <div className="page-container" style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1rem' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0, letterSpacing: '0.04em' }}>
            Inbox
          </h1>
          {unread > 0 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0', fontFamily: 'var(--font-body)' }}>
              {unread} unread notification{unread !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Filter */}
          <div style={{ display: 'flex', border: '1px solid var(--border-subtle)', borderRadius: '6px', overflow: 'hidden' }}>
            {['all', 'unread'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                background:    filter === f ? 'rgba(183,140,64,0.15)' : 'transparent',
                border:        'none',
                color:         filter === f ? 'var(--text-gold)' : 'var(--text-secondary)',
                padding:       '0.35rem 0.85rem',
                fontSize:      '0.72rem',
                fontFamily:    'var(--font-display)',
                fontWeight:    '600',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor:        'pointer',
                transition:    'all 0.15s',
              }}>
                {f === 'all' ? 'All' : `Unread${unread > 0 ? ` (${unread})` : ''}`}
              </button>
            ))}
          </div>

          {unread > 0 && (
            <button onClick={markAllRead} disabled={marking} style={{
              background: 'none', border: '1px solid var(--border-subtle)', borderRadius: '6px',
              color: 'var(--text-gold)', padding: '0.35rem 0.85rem', fontSize: '0.72rem',
              fontFamily: 'var(--font-display)', fontWeight: '600', letterSpacing: '0.1em',
              textTransform: 'uppercase', cursor: marking ? 'not-allowed' : 'pointer', opacity: marking ? 0.5 : 1,
            }}>
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* ── List ────────────────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)', borderRadius: '10px', overflow: 'hidden' }}>
        {loading && notifs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading…</div>
        ) : displayed.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔔</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontFamily: 'var(--font-body)', margin: 0 }}>
              {filter === 'unread' ? 'No unread notifications.' : 'Nothing here yet — check back after your first battle!'}
            </p>
          </div>
        ) : (
          displayed.map((n, i) => {
            const c      = cfg(n.type);
            const isLast = i === displayed.length - 1;

            return (
              <div key={n.id} style={{
                display:      'flex',
                gap:          '1rem',
                padding:      '1rem 1.25rem',
                borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
                background:   n.is_read ? 'transparent' : 'rgba(183,140,64,0.04)',
                borderLeft:   n.is_read ? '3px solid transparent' : `3px solid ${c.colour}`,
                alignItems:   'flex-start',
              }}>
                {/* Icon */}
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                  background: `${c.colour}1a`, border: `1px solid ${c.colour}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.1rem', marginTop: '2px',
                }}>
                  {c.icon}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Meta */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '0.63rem', fontFamily: 'var(--font-display)', fontWeight: '600',
                      letterSpacing: '0.1em', textTransform: 'uppercase', color: c.colour, opacity: 0.9,
                    }}>{c.label}</span>
                    <span style={{ color: 'var(--border-subtle)', fontSize: '0.63rem' }}>·</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                      {timeAgo(n.created_at)}
                    </span>
                  </div>

                  {/* Title — link if available */}
                  {n.link ? (
                    <Link href={n.link} style={{
                      fontSize: '0.92rem', fontWeight: n.is_read ? '400' : '600',
                      color: n.is_read ? 'var(--text-secondary)' : 'var(--text-gold)',
                      fontFamily: 'var(--font-body)', textDecoration: 'underline',
                      textDecorationColor: 'rgba(183,140,64,0.35)', lineHeight: '1.35',
                      display: 'block', marginBottom: '0.35rem',
                    }}>
                      {n.title} →
                    </Link>
                  ) : (
                    <p style={{
                      fontSize: '0.92rem', fontWeight: n.is_read ? '400' : '600',
                      color: n.is_read ? 'var(--text-secondary)' : 'var(--text-primary)',
                      fontFamily: 'var(--font-body)', margin: '0 0 0.35rem', lineHeight: '1.35',
                    }}>
                      {n.title}
                    </p>
                  )}

                  {/* Body */}
                  {n.body && (
                    <p style={{
                      fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'var(--font-body)',
                      margin: '0 0 0.5rem', lineHeight: '1.5',
                    }}>
                      {n.body}
                    </p>
                  )}

                  {/* Tip buttons */}
                  {n.metadata?.tips && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
                      {n.metadata.tips.map((tip, ti) => (
                        <Link key={ti} href={tip.link} style={{
                          fontSize: '0.72rem', fontFamily: 'var(--font-body)',
                          color: 'var(--text-gold)', background: 'rgba(183,140,64,0.1)',
                          border: '1px solid rgba(183,140,64,0.3)', borderRadius: '4px',
                          padding: '0.2rem 0.55rem', textDecoration: 'none', display: 'inline-block',
                        }}>
                          {tip.label} →
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Mark as read */}
                  {!n.is_read && (
                    <button onClick={(e) => markOneRead(e, n)} style={{
                      background: 'none', border: '1px solid var(--border-subtle)', borderRadius: '4px',
                      cursor: 'pointer', padding: '0.2rem 0.6rem',
                      fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-body)',
                      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                    }}>
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="2,6 5,9 10,3"/>
                      </svg>
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}

        {hasMore && filter === 'all' && (
          <div style={{ padding: '0.75rem', textAlign: 'center', borderTop: '1px solid var(--border-subtle)' }}>
            <button onClick={() => fetchPage(offset)} disabled={loading} style={{
              background: 'none', border: 'none', color: 'var(--text-gold)',
              cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.75rem',
              fontFamily: 'var(--font-display)', fontWeight: '600',
              letterSpacing: '0.1em', textTransform: 'uppercase', opacity: loading ? 0.5 : 1,
            }}>
              {loading ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
