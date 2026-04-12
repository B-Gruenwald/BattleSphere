'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// Shown in the campaign admin page. Lets the organiser queue a short message
// that appears at the top of subscribers' next campaign digest.
export default function OrganiserDigestMessage({ campaignId, userId, initialMessages }) {
  const [messages, setMessages]   = useState(initialMessages || []);
  const [draft, setDraft]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(null); // id of message being deleted
  const [error, setError]         = useState(null);
  const [saved, setSaved]         = useState(false);

  const MAX_CHARS = 400;

  async function handleQueue() {
    if (!draft.trim()) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data, error: insertErr } = await supabase
      .from('campaign_digest_messages')
      .insert({ campaign_id: campaignId, author_id: userId, message: draft.trim() })
      .select('*');
    if (insertErr) {
      setError('Could not queue message. Please try again.');
    } else {
      setMessages(prev => [data[0], ...prev]);
      setDraft('');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    setDeleting(id);
    const supabase = createClient();
    await supabase.from('campaign_digest_messages').delete().eq('id', id);
    setMessages(prev => prev.filter(m => m.id !== id));
    setDeleting(null);
  }

  function formatDate(ts) {
    return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <div>
      {/* Compose area */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.58rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--text-gold)',
          display: 'block',
          marginBottom: '0.5rem',
        }}>
          Commander&apos;s Orders
        </label>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value.slice(0, MAX_CHARS))}
          placeholder="Write a short message for your subscribers — it will appear at the top of their next digest…"
          rows={4}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-dim)',
            color: 'var(--text-primary)',
            padding: '0.75rem 1rem',
            fontSize: '0.9rem',
            lineHeight: 1.6,
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--gold)'}
          onBlur={e => e.target.style.borderColor = 'var(--border-dim)'}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {draft.length}/{MAX_CHARS}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {saved && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-gold)', fontStyle: 'italic' }}>
                ✓ Queued for next digest
              </span>
            )}
            {error && (
              <span style={{ fontSize: '0.8rem', color: '#e87070' }}>{error}</span>
            )}
            <button
              className="btn-primary"
              onClick={handleQueue}
              disabled={saving || !draft.trim()}
              style={{ opacity: (saving || !draft.trim()) ? 0.5 : 1 }}
            >
              {saving ? 'Queueing…' : 'Queue for next digest'}
            </button>
          </div>
        </div>
      </div>

      {/* Queued messages */}
      {messages.length > 0 && (
        <div>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.56rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: '0.75rem',
          }}>
            Queued messages — delivered in subscribers&apos; next digest
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {messages.map(msg => (
              <div key={msg.id} style={{
                border: '1px solid var(--border-dim)',
                padding: '0.85rem 1rem',
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start',
              }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                    {msg.message}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                    Queued {formatDate(msg.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(msg.id)}
                  disabled={deleting === msg.id}
                  style={{
                    background: 'none', border: '1px solid rgba(232,112,112,0.3)',
                    color: '#e87070', cursor: 'pointer',
                    fontSize: '0.72rem', padding: '0.25rem 0.6rem',
                    flexShrink: 0, opacity: deleting === msg.id ? 0.5 : 1,
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {messages.length === 0 && (
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          No messages queued. Anything you write here will appear at the top of subscribers&apos; next digest.
        </p>
      )}
    </div>
  );
}
