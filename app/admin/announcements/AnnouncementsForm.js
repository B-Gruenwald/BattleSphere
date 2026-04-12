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

export default function AnnouncementsForm({ announcements: initial, authorId }) {
  const [announcements, setAnnouncements] = useState(initial);
  const [title, setTitle]   = useState('');
  const [body, setBody]     = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState(null);
  const [deleting, setDeleting] = useState(null);

  async function handleAdd() {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data, error: insertErr } = await supabase
      .from('platform_announcements')
      .insert({ title: title.trim(), body: body.trim(), created_by: authorId })
      .select('*');
    if (insertErr) {
      setError('Could not save announcement: ' + insertErr.message);
    } else {
      setAnnouncements(prev => [data[0], ...prev]);
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

  function formatDate(ts) {
    return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <div>
      {/* ── Compose form ── */}
      <div style={{ border: '1px solid var(--border-dim)', padding: '1.75rem', marginBottom: '2rem' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={LABEL}>Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Public campaign pages are now live"
            style={INPUT}
            onFocus={e => e.target.style.borderColor = 'var(--gold)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-dim)'}
          />
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={LABEL}>Body</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="A short paragraph describing the update (2–3 sentences recommended)."
            rows={4}
            style={{ ...INPUT, resize: 'vertical', lineHeight: 1.6 }}
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

      {/* ── Existing announcements ── */}
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
        </p>

        {announcements.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No announcements queued. Anything you add here will appear in the &ldquo;What&apos;s new on BattleSphere&rdquo; section of the next digest for opted-in users.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {announcements.map(a => (
              <div key={a.id} style={{
                border: '1px solid var(--border-dim)',
                padding: '1rem 1.25rem',
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.92rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
                    {a.title}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '0.4rem' }}>
                    {a.body}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Queued {formatDate(a.created_at)}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
