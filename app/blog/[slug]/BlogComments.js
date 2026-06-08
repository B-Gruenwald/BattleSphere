'use client'
import { useState } from 'react'

export default function BlogComments({ postId, initialComments, currentUserId, isAdmin }) {
  const [comments, setComments]   = useState(initialComments || [])
  const [body, setBody]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!body.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/blog/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, body }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setComments(prev => [...prev, data.comment])
      setBody('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(commentId) {
    try {
      await fetch('/api/blog/comments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment_id: commentId }),
      })
      setComments(prev => prev.filter(c => c.id !== commentId))
    } catch (_) {}
  }

  const INPUT = {
    width: '100%', background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--border-dim)', color: 'var(--text-primary)',
    padding: '0.75rem 1rem', fontSize: '1rem', outline: 'none',
    boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.6,
  }

  return (
    <div style={{ marginTop: '3rem', paddingTop: '2.5rem', borderTop: '1px solid var(--border-dim)' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '1.75rem' }}>
        Comments ({comments.length})
      </h3>

      {/* Comment list */}
      {comments.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem', marginBottom: '2rem' }}>
          No comments yet — be the first.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginBottom: '2.5rem' }}>
          {comments.map(c => {
            const canDelete = isAdmin || c.user_id === currentUserId
            const date = new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            const username = c.profiles?.username || 'Commander'
            return (
              <div key={c.id} style={{ padding: '1.25rem 0', borderBottom: '1px solid var(--border-dim)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>{username}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{date}</span>
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(c.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', padding: '0 0.25rem' }}
                      title="Delete comment"
                    >✕</button>
                  )}
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {c.body}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Submit form */}
      {currentUserId ? (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Write a comment…"
            rows={4}
            style={INPUT}
            required
          />
          {error && <p style={{ color: '#e05a5a', fontSize: '0.85rem' }}>{error}</p>}
          <div>
            <button
              type="submit"
              disabled={submitting || !body.trim()}
              className="btn-primary"
              style={{ opacity: (submitting || !body.trim()) ? 0.5 : 1 }}
            >
              {submitting ? 'Posting…' : 'Post Comment'}
            </button>
          </div>
        </form>
      ) : (
        <div style={{ border: '1px solid var(--border-dim)', padding: '1.25rem 1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          <a href="/login" style={{ color: 'var(--text-gold)', textDecoration: 'none' }}>Log in</a> to leave a comment.
        </div>
      )}
    </div>
  )
}
