'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const INPUT = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--border-dim)',
  color: 'var(--text-primary)',
  padding: '0.75rem 1rem',
  fontSize: '0.95rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const LABEL = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.58rem',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--text-gold)',
  display: 'block',
  marginBottom: '0.5rem',
};

function sortByOrder(items) {
  return [...items].sort((a, b) => {
    const so = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (so !== 0) return so;
    return new Date(a.created_at) - new Date(b.created_at);
  });
}

export default function AnnouncementsForm({ announcements: initial, authorId }) {
  const [announcements, setAnnouncements] = useState(sortByOrder(initial));
  const [title, setTitle]       = useState('');
  const [body, setBody]         = useState('');
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [reordering, setReordering] = useState(null); // id being moved

  async function handleAdd() {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const nextOrder = announcements.length; // append to end
    const { data, error: insertErr } = await supabase
      .from('platform_announcements')
      .insert({ title: title.trim(), body: body.trim(), created_by: authorId, sort_order: nextOrder })
      .select('*');
    if (insertErr) {
      setError('Could not save announcement: ' + insertErr.message);
    } else {
      setAnnouncements(prev => sortByOrder([...prev, data[0]]));
      setTitle('');
      setBody('');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this announcement? It will no longer be included in any pending digests.')) return;
    setDeleting(id);
    const supabase = createClient();
    await supabase.from('platform_announcements').delete().eq('id', id);
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    setDeleting(null);
  }

  async function handleReorder(id, direction) {
    const idx = announcements.findIndex(a => a.id === id);
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= announcements.length) return;

    setReordering(id);

    // Build new ordered array
    const reordered = [...announcements];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];

    // Assign clean sequential sort_orders
    const updates = reordered.map((a, i) => ({ id: a.id, sort_order: i }));

    const supabase = createClient();
    await Promise.all(
      updates.map(u =>
        supabase.from('platform_announcements').update({ sort_order: u.sort_order }).eq('id', u.id)
      )
    );

    setAnnouncements(reordered.map((a, i) => ({ ...a, sort_order: i })));
    setReordering(null);
  }

  function formatDate(ts) {
    return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // Compute the next Friday (UTC) the digest cron will run
  function nextDigestFriday() {
    const now = new Date();
    const day = now.getUTCDay(); // 0=Sun … 5=Fri … 6=Sat
    const daysUntilFriday = day === 5 ? 7 : (5 - day + 7) % 7;
    const next = new Date(now);
    next.setUTCDate(now.getUTCDate() + daysUntilFriday);
    return next.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  }

  return (
    <div>
      {/* ── Formatting guide ── */}
      <div style={{
        background: 'rgba(183,140,64,0.06)',
        border: '1px solid rgba(183,140,64,0.2)',
        padding: '0.85rem 1rem',
        marginBottom: '1.75rem',
        fontSize: '0.8rem',
        color: 'var(--text-secondary)',
        lineHeight: 1.6,
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>Formatting</span>
        <br />
        <strong style={{ color: 'var(--text-primary)' }}>**bold text**</strong> renders as bold &nbsp;·&nbsp;
        Blank lines between paragraphs are preserved &nbsp;·&nbsp;
        <code style={{ fontSize: '0.78rem' }}>&lt;a href="..."&gt;link text&lt;/a&gt;</code> for links
      </div>

      {/* ── Compose form ── */}
      <div style={{ border: '1px solid var(--border-dim)', padding: '1.75rem', marginBottom: '2rem' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={LABEL}>Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Public campaign pages are now live"
            style={{ ...INPUT, fontSize: '1rem' }}
            onFocus={e => e.target.style.borderColor = 'var(--gold)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-dim)'}
          />
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={LABEL}>Body</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Write your announcement. Use **bold** for emphasis, leave blank lines between paragraphs, and <a href=&quot;...&quot;>link text</a> for links."
            rows={6}
            style={{ ...INPUT, fontSize: '1rem', resize: 'vertical', lineHeight: 1.6 }}
            onFocus={e => e.target.style.borderColor = 'var(--gold)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-dim)'}
          />
        </div>
        {error && <p style={{ color: '#e87070', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{error}</p>}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className="btn-primary"
            onClick={handleAdd}
            disabled={saving || !title.trim() || !body.trim()}
            style={{ opacity: saving || !title.trim() || !body.trim() ? 0.5 : 1 }}
          >
            {saving ? 'Saving…' : 'Queue announcement'}
          </button>
          {saved && (
            <span style={{ fontSize: '0.82rem', color: 'var(--text-gold)', fontStyle: 'italic' }}>
              ✓ Queued — will appear in subscribers&apos; next digest
            </span>
          )}
        </div>
      </div>

      {/* ── Queued announcements ── */}
      <div>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.56rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: '0.75rem',
        }}>
          Queued announcements ({announcements.length})
          {announcements.length > 1 && (
            <span style={{ marginLeft: '0.5rem', fontFamily: 'var(--font-body)', letterSpacing: 0, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'none', fontStyle: 'italic' }}>
              — use ↑ ↓ to set display order
            </span>
          )}
        </p>

        {announcements.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No announcements queued. Anything you add here will appear in the &ldquo;What&apos;s new on BattleSphere&rdquo; section of the next digest for opted-in users.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {announcements.map((a, idx) => (
              <div key={a.id} style={{
                border: '1px solid var(--border-dim)',
                display: 'flex',
                alignItems: 'stretch',
                opacity: reordering === a.id ? 0.5 : 1,
                transition: 'opacity 0.15s',
              }}>
                {/* Reorder strip */}
                {announcements.length > 1 && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    borderRight: '1px solid var(--border-dim)',
                    flexShrink: 0,
                  }}>
                    <button
                      onClick={() => handleReorder(a.id, 'up')}
                      disabled={idx === 0 || !!reordering}
                      title="Move up"
                      style={{
                        flex: 1,
                        width: '36px',
                        background: 'none',
                        border: 'none',
                        borderBottom: '1px solid var(--border-dim)',
                        color: idx === 0 ? 'var(--border-dim)' : 'var(--text-muted)',
                        cursor: idx === 0 ? 'default' : 'pointer',
                        fontSize: '0.75rem',
                        padding: 0,
                      }}
                    >↑</button>
                    <button
                      onClick={() => handleReorder(a.id, 'down')}
                      disabled={idx === announcements.length - 1 || !!reordering}
                      title="Move down"
                      style={{
                        flex: 1,
                        width: '36px',
                        background: 'none',
                        border: 'none',
                        color: idx === announcements.length - 1 ? 'var(--border-dim)' : 'var(--text-muted)',
                        cursor: idx === announcements.length - 1 ? 'default' : 'pointer',
                        fontSize: '0.75rem',
                        padding: 0,
                      }}
                    >↓</button>
                  </div>
                )}

                {/* Content */}
                <div style={{ flex: 1, padding: '1rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
                      {a.title}
                    </div>
                    <div style={{
                      fontSize: '0.82rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                      marginBottom: '0.4rem',
                      whiteSpace: 'pre-wrap',
                      maxHeight: '4.5rem',
                      overflow: 'hidden',
                    }}>
                      {a.body}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.2rem' }}>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Queued {formatDate(a.created_at)}
                      </span>
                      {a.sent_at ? (
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: '600',
                          color: '#6dbf7e',
                          background: 'rgba(109,191,126,0.1)',
                          border: '1px solid rgba(109,191,126,0.3)',
                          padding: '0.15rem 0.5rem',
                          letterSpacing: '0.04em',
                        }}>
                          ✓ Sent {formatDate(a.sent_at)}
                        </span>
                      ) : (
                        <span style={{
                          fontSize: '0.7rem',
                          color: 'var(--text-gold)',
                          background: 'rgba(183,140,64,0.08)',
                          border: '1px solid rgba(183,140,64,0.25)',
                          padding: '0.15rem 0.5rem',
                          letterSpacing: '0.04em',
                        }}>
                          Pending — next digest {nextDigestFriday()}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(a.id)}
                    disabled={deleting === a.id}
                    style={{
                      background: 'none', border: '1px solid rgba(232,112,112,0.3)',
                      color: '#e87070', cursor: 'pointer',
                      fontSize: '0.72rem', padding: '0.3rem 0.65rem', flexShrink: 0,
                      opacity: deleting === a.id ? 0.5 : 1,
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
