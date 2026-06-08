'use client'
import { useState } from 'react'

const INPUT = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--border-dim)',
  color: 'var(--text-primary)',
  padding: '0.75rem 1rem',
  fontSize: '1rem',
  outline: 'none',
  boxSizing: 'border-box',
}

const LABEL = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.58rem',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--text-gold)',
  display: 'block',
  marginBottom: '0.5rem',
}

export default function NotificationBroadcastForm({ campaigns, totalUsers }) {
  const [title,      setTitle]      = useState('')
  const [body,       setBody]       = useState('')
  const [link,       setLink]       = useState('')
  const [audience,   setAudience]   = useState('everyone')
  const [campaignId, setCampaignId] = useState('')
  const [sending,    setSending]    = useState(false)
  const [result,     setResult]     = useState(null)   // { ok, sent } | { error }

  const selectedCampaign = campaigns.find(c => c.id === campaignId)
  const recipientLabel = audience === 'everyone'
    ? `All ${totalUsers} registered users`
    : selectedCampaign
      ? `Members of "${selectedCampaign.name}"`
      : 'Select a campaign below'

  async function handleSend(e) {
    e.preventDefault()
    if (!title.trim()) return
    if (audience === 'campaign' && !campaignId) return

    setSending(true)
    setResult(null)

    try {
      const res = await fetch('/api/admin/broadcast-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, link, audience, campaignId: campaignId || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Send failed')
      setResult({ ok: true, sent: data.sent })
      setTitle('')
      setBody('')
      setLink('')
    } catch (err) {
      setResult({ error: err.message })
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* Audience */}
      <div>
        <label style={LABEL}>Audience</label>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {[
            { value: 'everyone', label: '📣 Everyone' },
            { value: 'campaign', label: '⚔ Campaign members' },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setAudience(opt.value)}
              style={{
                padding: '0.5rem 1.1rem',
                fontSize: '0.85rem',
                cursor: 'pointer',
                border: '1px solid',
                borderColor: audience === opt.value ? 'var(--gold)' : 'var(--border-dim)',
                background: audience === opt.value ? 'rgba(183,140,64,0.12)' : 'rgba(255,255,255,0.03)',
                color: audience === opt.value ? 'var(--text-gold)' : 'var(--text-secondary)',
                borderRadius: '4px',
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {audience === 'campaign' && (
          <select
            value={campaignId}
            onChange={e => setCampaignId(e.target.value)}
            style={{ ...INPUT, marginTop: '0.75rem', fontSize: '1rem' }}
            required
          >
            <option value="">— Select campaign —</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}

        <p style={{ marginTop: '0.6rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Will send to: {recipientLabel}
        </p>
      </div>

      {/* Title */}
      <div>
        <label style={LABEL}>Title <span style={{ color: '#e05a5a' }}>*</span></label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. New feature: Army deployment overhaul"
          style={INPUT}
          required
          maxLength={120}
        />
        <p style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Shown in the bell dropdown. Keep it short.
        </p>
      </div>

      {/* Body */}
      <div>
        <label style={LABEL}>Body <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Optional longer description shown in the Inbox…"
          rows={4}
          style={{ ...INPUT, resize: 'vertical', lineHeight: 1.6 }}
        />
      </div>

      {/* Link */}
      <div>
        <label style={LABEL}>Link <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
        <input
          type="text"
          value={link}
          onChange={e => setLink(e.target.value)}
          placeholder="e.g. /armies/new or https://battlesphere.cc/blog/…"
          style={INPUT}
        />
        <p style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          If set, the notification title becomes a clickable link.
        </p>
      </div>

      {/* Preview */}
      {title.trim() && (
        <div style={{
          border: '1px solid rgba(183,140,64,0.3)',
          background: 'rgba(183,140,64,0.05)',
          padding: '1rem 1.25rem',
          borderRadius: '4px',
        }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.54rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
            Preview
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.1rem', marginTop: '0.1rem' }}>📣</span>
            <div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '500', marginBottom: body ? '0.3rem' : 0 }}>
                {title}
              </p>
              {body && (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{body}</p>
              )}
              {link && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-gold)', marginTop: '0.3rem' }}>→ {link}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Result feedback */}
      {result?.ok && (
        <div style={{ padding: '0.85rem 1.25rem', border: '1px solid rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.07)', color: '#4ade80', fontSize: '0.9rem', borderRadius: '4px' }}>
          ✓ Sent to {result.sent} {result.sent === 1 ? 'user' : 'users'}.
        </div>
      )}
      {result?.error && (
        <div style={{ padding: '0.85rem 1.25rem', border: '1px solid rgba(224,90,90,0.3)', background: 'rgba(224,90,90,0.07)', color: '#e05a5a', fontSize: '0.9rem', borderRadius: '4px' }}>
          ✗ {result.error}
        </div>
      )}

      {/* Send button */}
      <div>
        <button
          type="submit"
          disabled={sending || !title.trim() || (audience === 'campaign' && !campaignId)}
          className="btn-primary"
          style={{ opacity: (sending || !title.trim() || (audience === 'campaign' && !campaignId)) ? 0.5 : 1 }}
        >
          {sending ? 'Sending…' : `📣 Send Notification`}
        </button>
      </div>

    </form>
  )
}
