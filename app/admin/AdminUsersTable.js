'use client'
import { useState } from 'react'
import Link from 'next/link'

// Each row: { id, username, email, is_admin, campaignCount, armyCount, battleCount,
//             bestScore, bestScoreLabel, lastActiveIso, activityLabel, activityColor,
//             activityDot, created_at }

const colHeaderStyle = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.54rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
}
const sortableStyle = { ...colHeaderStyle, cursor: 'pointer', userSelect: 'none' }

// Username | Email | Campaigns | Armies | Battles | Best Score | Status | Last Active | Registered | Link
const COLS = '1.2fr 1.8fr 60px 60px 60px 80px 80px 120px 120px 80px'

function ScoreBadge({ score, label }) {
  if (!score) return <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>—</span>
  const color = score >= 70 ? 'var(--text-gold)' : score >= 40 ? '#9ca3af' : '#555'
  const bg    = score >= 70 ? 'rgba(183,140,64,0.12)' : score >= 40 ? 'rgba(156,163,175,0.1)' : 'rgba(80,80,80,0.1)'
  return (
    <span title={label} style={{
      display: 'inline-block', padding: '0.15rem 0.45rem', borderRadius: '4px',
      fontSize: '0.8rem', fontWeight: '700', color, background: bg,
      minWidth: '32px', textAlign: 'center',
    }}>
      {score}
    </span>
  )
}

export default function AdminUsersTable({ rows }) {
  const [sortKey, setSortKey] = useState('bestScore')
  const [sortDir, setSortDir] = useState('desc')

  function toggleSort(key) {
    if (sortKey === key) { setSortDir(d => d === 'desc' ? 'asc' : 'desc') }
    else { setSortKey(key); setSortDir('desc') }
  }

  const sorted = [...(rows || [])].sort((a, b) => {
    let av, bv
    if (sortKey === 'bestScore') {
      av = a.bestScore || 0; bv = b.bestScore || 0
    } else if (sortKey === 'lastActive') {
      av = a.lastActiveIso ? new Date(a.lastActiveIso).getTime() : 0
      bv = b.lastActiveIso ? new Date(b.lastActiveIso).getTime() : 0
    } else {
      av = new Date(a.created_at).getTime()
      bv = new Date(b.created_at).getTime()
    }
    return sortDir === 'desc' ? bv - av : av - bv
  })

  function sortLabel(key) {
    return sortKey === key ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''
  }

  return (
    <div style={{ border: '1px solid var(--border-dim)' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: COLS, gap: '1rem',
        padding: '0.7rem 1.25rem',
        borderBottom: '1px solid var(--border-dim)',
        background: 'rgba(255,255,255,0.02)',
        alignItems: 'center',
      }}>
        <span style={colHeaderStyle}>Username</span>
        <span style={colHeaderStyle}>Email</span>
        <span style={colHeaderStyle} title="Campaigns joined">⚔</span>
        <span style={colHeaderStyle} title="Armies owned">🛡</span>
        <span style={colHeaderStyle} title="Battles played">💀</span>
        <span style={sortableStyle} onClick={() => toggleSort('bestScore')} title="Best content score across armies + campaigns">
          Best Score{sortLabel('bestScore')}
        </span>
        <span style={colHeaderStyle}>Status</span>
        <span style={sortableStyle} onClick={() => toggleSort('lastActive')} title="Sort by last activity">
          Last Active{sortLabel('lastActive')}
        </span>
        <span style={sortableStyle} onClick={() => toggleSort('created')} title="Sort by registration date">
          Registered{sortLabel('created')}
        </span>
        <span style={colHeaderStyle}></span>
      </div>

      {sorted.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          No users found.
        </div>
      ) : (
        sorted.map(p => (
          <div key={p.id} style={{
            display: 'grid', gridTemplateColumns: COLS, gap: '1rem',
            padding: '0.85rem 1.25rem',
            borderBottom: '1px solid var(--border-dim)',
            alignItems: 'center',
          }}>
            {/* Username */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: p.is_admin ? '600' : '400' }}>
                {p.username}
              </span>
              {p.is_admin && (
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: '0.48rem', letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: '#e05a5a',
                  background: 'rgba(224,90,90,0.1)', padding: '0.12rem 0.35rem',
                  border: '1px solid rgba(224,90,90,0.3)',
                }}>Admin</span>
              )}
            </div>
            {/* Email */}
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.email ?? '—'}
            </div>
            {/* Counts */}
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              {p.campaignCount}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              {p.armyCount}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              {p.battleCount}
            </div>
            {/* Best score */}
            <div><ScoreBadge score={p.bestScore} label={p.bestScoreLabel} /></div>
            {/* Activity */}
            <div style={{ fontSize: '0.8rem' }}>
              <span title={p.activityLabel}>{p.activityDot}</span>
              <span style={{ marginLeft: '0.35rem', color: p.activityColor, fontSize: '0.72rem' }}>
                {p.activityLabel}
              </span>
            </div>
            {/* Last active */}
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {p.lastActiveIso
                ? new Date(p.lastActiveIso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'}
            </div>
            {/* Registered */}
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            {/* Profile link */}
            <div>
              {p.username ? (
                <Link href={`/players/${encodeURIComponent(p.username.replace(/#.*$/, ''))}`} style={{
                  fontFamily: 'var(--font-display)', fontSize: '0.54rem', letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: '#e05a5a', textDecoration: 'none',
                }}>Profile →</Link>
              ) : (
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>—</span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
