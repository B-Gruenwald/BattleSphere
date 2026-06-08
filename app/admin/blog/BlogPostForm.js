'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const TYPE_OPTIONS = [
  { value: 'dev_update',      label: '⚙ Dev Update' },
  { value: 'community_query', label: '❓ Community Query' },
  { value: 'general',         label: '📣 News / General' },
  { value: 'spotlight',       label: '✦ Community Spotlight' },
]

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
const HINT = { marginTop: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }

export default function BlogPostForm({ post }) {
  const isEditing = !!post
  const router = useRouter()

  const [title,       setTitle]       = useState(post?.title       || '')
  const [summary,     setSummary]     = useState(post?.summary     || '')
  const [content,     setContent]     = useState(post?.body        || '')
  const [type,        setType]        = useState(post?.type        || 'general')
  const [coverUrl,    setCoverUrl]    = useState(post?.cover_url   || '')
  const [isPublished, setIsPublished] = useState(post?.is_published || false)
  const [saving,      setSaving]      = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [error,       setError]       = useState(null)

  async function handleSave(publish) {
    if (!title.trim()) { setError('Title is required.'); return }
    setSaving(true)
    setError(null)
    try {
      const method = isEditing ? 'PATCH' : 'POST'
      const res = await fetch('/api/admin/blog', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id:           post?.id,
          title, summary, content, type,
          cover_url:    coverUrl,
          is_published: publish ?? isPublished,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push('/admin/blog')
      router.refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this post permanently?')) return
    setDeleting(true)
    try {
      await fetch('/api/admin/blog', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: post.id }),
      })
      router.push('/admin/blog')
      router.refresh()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* Type */}
      <div>
        <label style={LABEL}>Post Type</label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {TYPE_OPTIONS.map(opt => (
            <button key={opt.value} type="button" onClick={() => setType(opt.value)} style={{
              padding: '0.45rem 0.9rem', fontSize: '0.85rem', cursor: 'pointer', border: '1px solid',
              borderRadius: '4px', transition: 'all 0.15s',
              borderColor: type === opt.value ? 'var(--gold)' : 'var(--border-dim)',
              background:  type === opt.value ? 'rgba(183,140,64,0.12)' : 'rgba(255,255,255,0.03)',
              color:       type === opt.value ? 'var(--text-gold)' : 'var(--text-secondary)',
            }}>{opt.label}</button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label style={LABEL}>Title <span style={{ color: '#e05a5a' }}>*</span></label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Post title…" style={INPUT} maxLength={160} />
      </div>

      {/* Summary */}
      <div>
        <label style={LABEL}>Summary <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
        <input type="text" value={summary} onChange={e => setSummary(e.target.value)}
          placeholder="Short excerpt shown on the blog list…" style={INPUT} maxLength={300} />
        <p style={HINT}>Shown in the post list. If blank, no excerpt is shown.</p>
      </div>

      {/* Body */}
      <div>
        <label style={LABEL}>Body</label>
        <textarea value={content} onChange={e => setContent(e.target.value)}
          placeholder="Write your post here… Markdown is supported: **bold**, *italic*, ## Heading, > blockquote, - list items"
          rows={18} style={{ ...INPUT, resize: 'vertical', lineHeight: 1.7, fontFamily: 'monospace', fontSize: '0.92rem' }} />
        <p style={HINT}>Markdown supported: **bold**, *italic*, ## headings, &gt; blockquotes, - lists, [link text](url)</p>
      </div>

      {/* Cover image URL */}
      <div>
        <label style={LABEL}>Cover Image URL <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
        <input type="text" value={coverUrl} onChange={e => setCoverUrl(e.target.value)}
          placeholder="https://…" style={INPUT} />
        {coverUrl && (
          <img src={coverUrl} alt="Preview" style={{ marginTop: '0.75rem', maxHeight: '160px', objectFit: 'cover', width: '100%', opacity: 0.85 }} />
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '0.75rem 1rem', border: '1px solid rgba(224,90,90,0.3)', background: 'rgba(224,90,90,0.07)', color: '#e05a5a', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--border-dim)' }}>
        <button onClick={() => handleSave(true)} disabled={saving} className="btn-primary"
          style={{ opacity: saving ? 0.5 : 1 }}>
          {saving ? 'Saving…' : isPublished ? '✓ Save & Keep Published' : '🌐 Save & Publish'}
        </button>
        <button onClick={() => handleSave(false)} disabled={saving} className="btn-secondary"
          style={{ opacity: saving ? 0.5 : 1 }}>
          {isPublished ? 'Unpublish (save as draft)' : 'Save as Draft'}
        </button>
        {isEditing && (
          <button onClick={handleDelete} disabled={deleting}
            style={{ marginLeft: 'auto', background: 'none', border: '1px solid rgba(224,90,90,0.4)', color: '#e05a5a', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.85rem', opacity: deleting ? 0.5 : 1 }}>
            {deleting ? 'Deleting…' : 'Delete Post'}
          </button>
        )}
      </div>
    </div>
  )
}
