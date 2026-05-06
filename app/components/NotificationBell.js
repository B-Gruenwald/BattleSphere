'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { NOTIF_CONFIG } from '@/app/lib/notifications';

// ── Time-ago helper ────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function NotificationBell() {
  const [open,        setOpen]        = useState(false);
  const [notifs,      setNotifs]      = useState([]);
  const [unread,      setUnread]      = useState(0);
  const [loading,     setLoading]     = useState(false);
  const dropRef = useRef(null);

  // ── Fetch notifications ──────────────────────────────────────────────────────
  const fetchNotifs = useCallback(async () => {
    try {
      const res  = await fetch('/api/notifications?limit=8');
      if (!res.ok) return;
      const data = await res.json();
      setNotifs(data.notifications ?? []);
      setUnread(data.unreadCount   ?? 0);
    } catch {}
  }, []);

  // Fetch on mount and every 60 s
  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Mark all read ────────────────────────────────────────────────────────────
  async function markAllRead() {
    if (!unread) return;
    setLoading(true);
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnread(0);
    } catch {}
    setLoading(false);
  }

  // ── Mark single read + navigate ──────────────────────────────────────────────
  async function handleItemClick(notif) {
    if (!notif.is_read) {
      fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [notif.id] }),
      }).catch(() => {});
      setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    }
    setOpen(false);
  }

  const cfg = (type) => NOTIF_CONFIG[type] ?? { icon: '🔔', colour: '#a09880', label: 'Notification' };

  return (
    <div ref={dropRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>

      {/* ── Bell button ─────────────────────────────────────────────────────── */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) fetchNotifs(); }}
        aria-label={`Notifications${unread > 0 ? ` — ${unread} unread` : ''}`}
        style={{
          background:   'none',
          border:        'none',
          cursor:        'pointer',
          padding:       '0.25rem',
          position:      'relative',
          display:       'flex',
          alignItems:    'center',
          color:         open ? 'var(--text-gold)' : 'var(--text-secondary)',
          transition:    'color 0.15s',
        }}
      >
        {/* Bell SVG */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>

        {/* Unread badge */}
        {unread > 0 && (
          <span style={{
            position:     'absolute',
            top:          '-2px',
            right:        '-2px',
            background:   '#e05a5a',
            color:        '#fff',
            borderRadius: '999px',
            fontSize:     '0.6rem',
            fontWeight:   '700',
            lineHeight:   1,
            minWidth:     '16px',
            height:       '16px',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            padding:      '0 3px',
            fontFamily:   'var(--font-body)',
          }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* ── Dropdown ────────────────────────────────────────────────────────── */}
      {open && (
        <div style={{
          position:     'absolute',
          top:          'calc(100% + 0.5rem)',
          right:        0,
          width:        '340px',
          background:   'var(--bg-raised)',
          border:       '1px solid var(--border-subtle)',
          borderRadius: '8px',
          boxShadow:    '0 8px 32px rgba(0,0,0,0.5)',
          zIndex:       1000,
          overflow:     'hidden',
        }}>

          {/* Header */}
          <div style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            padding:        '0.75rem 1rem',
            borderBottom:   '1px solid var(--border-subtle)',
          }}>
            <span style={{
              fontFamily:    'var(--font-display)',
              fontSize:      '0.7rem',
              fontWeight:    '600',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color:         'var(--text-primary)',
            }}>
              Notifications {unread > 0 && (
                <span style={{ color: '#e05a5a', marginLeft: '0.4rem' }}>
                  {unread} unread
                </span>
              )}
            </span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                disabled={loading}
                style={{
                  background:  'none',
                  border:      'none',
                  cursor:      'pointer',
                  fontSize:    '0.72rem',
                  color:       'var(--text-gold)',
                  fontFamily:  'var(--font-body)',
                  padding:     0,
                  opacity:     loading ? 0.5 : 1,
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {notifs.length === 0 ? (
              <div style={{
                padding:   '2rem 1rem',
                textAlign: 'center',
                color:     'var(--text-muted)',
                fontSize:  '0.85rem',
              }}>
                No notifications yet
              </div>
            ) : (
              notifs.map(n => {
                const c = cfg(n.type);
                const inner = (
                  <div
                    style={{
                      display:         'flex',
                      gap:             '0.75rem',
                      padding:         '0.75rem 1rem',
                      borderBottom:    '1px solid var(--border-subtle)',
                      background:      n.is_read ? 'transparent' : 'rgba(183,140,64,0.05)',
                      cursor:          n.link ? 'pointer' : 'default',
                      transition:      'background 0.15s',
                      alignItems:      'flex-start',
                      textDecoration:  'none',
                    }}
                    onClick={() => handleItemClick(n)}
                  >
                    {/* Icon dot */}
                    <div style={{
                      width:        '32px',
                      height:       '32px',
                      borderRadius: '50%',
                      background:   `${c.colour}22`,
                      border:       `1px solid ${c.colour}55`,
                      display:      'flex',
                      alignItems:   'center',
                      justifyContent: 'center',
                      fontSize:     '0.9rem',
                      flexShrink:   0,
                      marginTop:    '2px',
                    }}>
                      {c.icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display:      'flex',
                        alignItems:   'center',
                        gap:          '0.4rem',
                        marginBottom: '0.2rem',
                      }}>
                        {!n.is_read && (
                          <span style={{
                            width:        '7px',
                            height:       '7px',
                            borderRadius: '50%',
                            background:   '#e05a5a',
                            flexShrink:   0,
                          }} />
                        )}
                        <span style={{
                          fontSize:   '0.8rem',
                          fontWeight: n.is_read ? '400' : '600',
                          color:      n.is_read ? 'var(--text-secondary)' : 'var(--text-primary)',
                          fontFamily: 'var(--font-body)',
                          overflow:   'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {n.title}
                        </span>
                      </div>
                      {n.body && (
                        <p style={{
                          fontSize:    '0.75rem',
                          color:       'var(--text-muted)',
                          margin:      '0 0 0.25rem',
                          lineHeight:  '1.4',
                          fontFamily:  'var(--font-body)',
                          overflow:    'hidden',
                          display:     '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}>
                          {n.body}
                        </p>
                      )}
                      <span style={{
                        fontSize:   '0.68rem',
                        color:      'var(--text-muted)',
                        fontFamily: 'var(--font-body)',
                        opacity:    0.7,
                      }}>
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                  </div>
                );

                return n.link ? (
                  <Link key={n.id} href={n.link} style={{ textDecoration: 'none', display: 'block' }}>
                    {inner}
                  </Link>
                ) : (
                  <div key={n.id}>{inner}</div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding:      '0.6rem 1rem',
            borderTop:    '1px solid var(--border-subtle)',
            textAlign:    'center',
          }}>
            <Link
              href="/inbox"
              onClick={() => setOpen(false)}
              style={{
                fontSize:    '0.72rem',
                fontFamily:  'var(--font-display)',
                fontWeight:  '600',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color:       'var(--text-gold)',
                textDecoration: 'none',
              }}
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
