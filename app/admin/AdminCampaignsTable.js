'use client'
import { useState } from 'react'
import Link from 'next/link'

// Receives pre-scored campaign rows from the server page.
// Each row: { id, name, slug, setting, organiserUsername, memberCount, battleCount,
//             score, lastActiveIso, activityLabel, activityColor, activityDot, created_at }

const colHeaderStyle = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.54rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  cursor: 'default',
}
const sortableStyle = {
  ...colHeaderStyle,
  cursor: 'pointer',
  userSelect: 'none',
}

const COLS = '2fr 1.2fr 60px 60px 74px 80px 120px 110px'

function ScoreBadge({ score }) {
  const color  = score >= 70 ? 'var(--text-gold)' : score >= 40 ? '#9ca3af' : '#555'
  const bg     = score >= 70 ? 'rgba(183,140,64,0.12)' : score >= 40 ? 'rgba(156,163,175,0.1)' : 'rgba(80,80,80,0.1)'
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.15rem 0.45rem',
      borderRadius: '4px',
      fontSize: '0.8rem',
      fontWeight: '700',
      color,
      background: bg,
      minWidth: '32px',
      textAlign: 'center',
    }}>
      {score}
    </span>
  )
}

export default function AdminCampaignsTable({ rows }) {
  const [sortKey, setSortKey] = useState('score')   // 'score' | 'lastActive' | 'created'
  const [sortDir, setSortDir] = useState('desc')

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...(rows || [])].sort((a, b) => {
    let av, bv
    if (sortKey === 'score') {
      av = a.score; bv = b.score
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
    if (sortKey !== key) return ''
    return sortDir === 'desc' ? ' ↓' : ' ↑'
  }

  return (
    <div style={{ border: '1px solid var(--border-dim)' }}>
      {/* Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: COLS, gap: '1rem',
        padding: '0.7rem 1.25rem',
        borderBottom: '1px solid var(--border-dim)',
        background: 'rgba(255,255,255,0.02)',
        alignItems: 'center',
      }}>
        <span style={colHeaderStyle}>Campaign</span>
        <span style={colHeaderStyle}>Organiser</span>
        <span style={colHeaderStyle}>Mbrs</span>
        <span style={colHeaderStyle}>Battles</span>
        <span style={sortableStyle} onClick={() => toggleSort('score')} title="Sort by engagement score">
          Score{sortLabel('score')}
        </span>
        <span style={colHeaderStyle}>Status</span>
        <span style={sortableStyle} onClick={() => toggleSort('lastActive')} title="Sort by last activity">
          Last Active{sortLabel('lastActive')}
        </span>
        <span style={sortableStyle} onClick={() => toggleSort('created')} title="Sort by created date">
          Created{sortLabel('created')}
        </span>
      </div>

      {sorted.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          No campaigns yet.
        </div>
      ) : (
        sorted.map(c => (
          <div key={c.id} style={{
            display: 'grid', gridTemplateColumns: COLS, gap: '1rem',
            padding: '0.9rem 1.25rem',
            borderBottom: '1px solid var(--border-dim)',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.15rem' }}>
                {c.name}
              </div>
              {c.setting && (
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {c.setting}
                </div>
              )}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {c.organiserUsername ?? '—'}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              {c.memberCount}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              {c.battleCount}
            </div>
            <div><ScoreBadge score={c.score} /></div>
            <div style={{ fontSize: '0.8rem' }} title={`Last active: ${c.lastActiveIso ?? 'unknown'}`}>
              <span title={c.activityLabel}>{c.activityDot}</span>
              <span style={{ marginLeft: '0.35rem', color: c.activityColor, fontSize: '0.72rem' }}>
                {c.activityLabel}
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {c.lastActiveIso
                ? new Date(c.lastActiveIso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <Link href={`/admin/campaigns/${c.id}`} style={{
                fontFamily: 'var(--font-display)', fontSize: '0.54rem', letterSpacing: '0.1em',
                textTransform: 'uppercase', color: '#e05a5a', textDecoration: 'none',
              }}>Detail →</Link>
              <Link href={`/c/${c.slug}`} style={{
                fontFamily: 'var(--font-display)', fontSize: '0.54rem', letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'var(--text-muted)', textDecoration: 'none',
              }}>Visit ↗</Link>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
