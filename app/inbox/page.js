'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { NOTIF_CONFIG } from '@/app/lib/notifications';

// ── Time-ago helper ────────────────────────────────────────────────────────────
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
  const [notifs,    setNotifs]    = useState([]);
  const [unread,    setUnread]    = useState(0);
  const [offset,    setOffset]    = useState(0);
  const [hasMore,   setHasMore]   = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [marking,   setMarking]   = useState(false);
  const [filter,    setFilter]    = useState('all'); // 'all' | 'unread'

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
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ all: true }),
      });
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnread(0);
    } catch {}
    setMarking(false);
  }

  async function markOneRead(notif) {
    if (notif.is_read) return;
    fetch('/api/notifications', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ids: [notif.id] }),
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
          {/* Filter toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--border-subtle)', borderRadius: '6px', overflow: 'hidden' }}>
            {['all', 'unread'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  background:   filter === f ? 'rgba(183,140,64,0.15)' : 'transparent',
                  border:       'none',
                  color:        filter === f ? 'var(--text-gold)' : 'var(--text-secondary)',
                  padding:      '0.35rem 0.85rem',
                  fontSize:     '0.72rem',
                  fontFamily:   'var(--font-display)',
                  fontWeight:   '600',
                  letterSpacing:'0.1em',
                  textTransform:'uppercase',
                  cursor:       'pointer',
                  transition:   'all 0.15s',
                }}
              >
                {f === 'all' ? 'All' : `Unread${unread > 0 ? ` (${unread})` : ''}`}
              </button>
            ))}
          </div>

          {unread > 0 && (
            <button
              onClick={markAllRead}
              disabled={marking}
              style={{
                background:   'none',
                border:       '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color:        'var(--text-gold)',
                padding:      '0.35rem 0.85rem',
                fontSize:     '0.72rem',
                fontFamily:   'var(--font-display)',
                fontWeight:   '600',
                letterSpacing:'0.1em',
                textTransform:'uppercase',
                cursor:        marking ? 'not-allowed' : 'pointer',
                opacity:       marking ? 0.5 : 1,
              }}
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* ── Notification list ────────────────────────────────────────────────── */}
      <div style={{
        background:   'var(--bg-raised)',
        border:       '1px solid var(--border-subtle)',
        borderRadius: '10px',
        overflow:     'hidden',
      }}>
        {loading && notifs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Loading…
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔔</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontFamily: 'var(--font-body)', margin: 0 }}>
              {filter === 'unread' ? 'No unread notifications.' : 'Nothing here yet — check back after your first battle!'}
            </p>
          </div>
        ) : (
          displayed.map((n, i) => {
            const c = cfg(n.type);
            const isLast = i === displayed.length - 1;

            const cardContent = (
              <div
                onClick={() => markOneRead(n)}
                style={{
                  display:      'flex',
                  gap:          '1rem',
                  padding:      '1rem 1.25rem',
                  borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
                  background:   n.is_read ? 'transparent' : 'rgba(183,140,64,0.04)',
                  cursor:       n.link ? 'pointer' : 'default',
                  transition:   'background 0.15s',
                  alignItems:   'flex-start',
                  borderLeft:   n.is_read ? '3px solid transparent' : `3px solid ${c.colour}`,
                  textDecoration: 'none',
                }}
              >
                {/* Icon */}
                <div style={{
                  width:          '40px',
                  height:         '40px',
                  borderRadius:   '50%',
                  background:     `${c.colour}1a`,
                  border:         `1px solid ${c.colour}44`,
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  fontSize:       '1.1rem',
                  flexShrink:     0,
                  marginTop:      '2px',
                }}>
                  {c.icon}
                </div>

                {/* Text block */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize:    '0.65rem',
                      fontFamily:  'var(--font-display)',
                      fontWeight:  '600',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color:       c.colour,
                      opacity:     0.9,
                    }}>
                      {c.label}
                    </span>
                    <span style={{ color: 'var(--border-subtle)', fontSize: '0.65rem' }}>·</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                      {timeAgo(n.created_at)}
                    </span>
                    {!n.is_read && (
                      <span style={{
                        marginLeft:   'auto',
                        width:        '8px',
                        height:       '8px',
                        borderRadius: '50%',
                        background:   '#e05a5a',
                        flexShrink:   0,
                      }} />
                    )}
                  </div>

                  <p style={{
                    fontSize:   '0.9rem',
                    fontWeight: n.is_read ? '400' : '600',
                    color:      n.is_read ? 'var(--text-secondary)' : 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                    margin:     '0 0 0.3rem',
                    lineHeight: '1.35',
                  }}>
                    {n.title}
                  </p>

                  {n.body && (
                    <p style={{
                      fontSize:   '0.8rem',
                      color:      'var(--text-muted)',
                      fontFamily: 'var(--font-body)',
                      margin:     0,
                      lineHeight: '1.5',
                    }}>
                      {n.body}
                    </p>
                  )}

                  {/* Onboarding tips from metadata */}
                  {n.metadata?.tips && (
                    <div style={{ marginTop: '0.6rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {n.metadata.tips.map((tip, ti) => (
                        <Link
                          key={ti}
                          href={tip.link}
                          onClick={e => e.stopPropagation()}
                          style={{
                            fontSize:     '0.72rem',
                            fontFamily:   'var(--font-body)',
                            color:        'var(--text-gold)',
                            background:   'rgba(183,140,64,0.1)',
                            border:       '1px solid rgba(183,140,64,0.3)',
                            borderRadius: '4px',
                            padding:      '0.2rem 0.5rem',
                            textDecoration: 'none',
                            display:      'inline-block',
                          }}
                        >
                          {tip.label} →
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );

            return n.link ? (
              <Link key={n.id} href={n.link} style={{ textDecoration: 'none', display: 'block' }}>
                {cardContent}
              </Link>
            ) : (
              <div key={n.id}>{cardContent}</div>
            );
          })
        )}

        {/* Load more */}
        {hasMore && filter === 'all' && (
          <div style={{ padding: '0.75rem', textAlign: 'center', borderTop: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => fetchPage(offset)}
              disabled={loading}
              style={{
                background:    'none',
                border:        'none',
                color:         'var(--text-gold)',
                cursor:        loading ? 'not-allowed' : 'pointer',
                fontSize:      '0.75rem',
                fontFamily:    'var(--font-display)',
                fontWeight:    '600',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                opacity:       loading ? 0.5 : 1,
              }}
            >
              {loading ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
