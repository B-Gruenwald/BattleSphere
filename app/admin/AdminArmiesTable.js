'use client'
import { useState } from 'react'
import Link from 'next/link'

// Each row: { id, name, faction, game_system, is_public,
//             ownerUsername, unitCount, score, lastActiveIso,
//             activityLabel, activityColor, activityDot, updated_at,
//             hasDescription, hasPortrait, photoCount, isDeployed }

const colHeaderStyle = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.54rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
}
const sortableStyle = { ...colHeaderStyle, cursor: 'pointer', userSelect: 'none' }

const COLS = '2fr 1.2fr 80px 70px 74px 80px 120px 80px'

function Tag({ label, colour = '#c97b5a' }) {
  return (
    <span style={{
      fontFamily: 'var(--font-display)', fontSize: '0.5rem', letterSpacing: '0.08em',
      textTransform: 'uppercase', color: colour,
      border: `1px solid ${colour}55`, padding: '0.1rem 0.35rem',
      whiteSpace: 'nowrap',
    }}>{label}</span>
  )
}

function ScoreBadge({ score }) {
  const color = score >= 70 ? 'var(--text-gold)' : score >= 40 ? '#9ca3af' : '#555'
  const bg    = score >= 70 ? 'rgba(183,140,64,0.12)' : score >= 40 ? 'rgba(156,163,175,0.1)' : 'rgba(80,80,80,0.1)'
  return (
    <span style={{
      display: 'inline-block', padding: '0.15rem 0.45rem', borderRadius: '4px',
      fontSize: '0.8rem', fontWeight: '700', color, background: bg,
      minWidth: '32px', textAlign: 'center',
    }}>
      {score}
    </span>
  )
}

export default function AdminArmiesTable({ rows }) {
  const [sortKey, setSortKey] = useState('score')
  const [sortDir, setSortDir] = useState('desc')

  function toggleSort(key) {
    if (sortKey === key) { setSortDir(d => d === 'desc' ? 'asc' : 'desc') }
    else { setSortKey(key); setSortDir('desc') }
  }

  const sorted = [...(rows || [])].sort((a, b) => {
    let av, bv
    if (sortKey === 'score') {
      av = a.score; bv = b.score
    } else if (sortKey === 'lastActive') {
      av = a.lastActiveIso ? new Date(a.lastActiveIso).getTime() : 0
      bv = b.lastActiveIso ? new Date(b.lastActiveIso).getTime() : 0
    } else {
      av = new Date(a.updated_at || a.created_at).getTime()
      bv = new Date(b.updated_at || b.created_at).getTime()
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
        <span style={colHeaderStyle}>Army</span>
        <span style={colHeaderStyle}>Owner</span>
        <span style={colHeaderStyle}>Units</span>
        <span style={sortableStyle} onClick={() => toggleSort('score')} title="Sort by engagement score">
          Score{sortLabel('score')}
        </span>
        <span style={colHeaderStyle}>Status</span>
        <span style={sortableStyle} onClick={() => toggleSort('lastActive')} title="Sort by last activity">
          Last Active{sortLabel('lastActive')}
        </span>
        <span style={sortableStyle} onClick={() => toggleSort('updated')} title="Sort by last updated">
          Updated{sortLabel('updated')}
        </span>
        <span style={colHeaderStyle}></span>
      </div>

      {sorted.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          No armies found.
        </div>
      ) : (
        sorted.map(a => (
          <div key={a.id} style={{
            display: 'grid', gridTemplateColumns: COLS, gap: '1rem',
            padding: '0.9rem 1.25rem',
            borderBottom: '1px solid var(--border-dim)',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.15rem' }}>
                {a.name}
              </div>
              {a.faction && (
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '0.3rem' }}>
                  {a.faction}{a.game_system ? ` · ${a.game_system}` : ''}
                </div>
              )}
              {(a.hasDescription || a.hasCover || a.hasPortrait || a.photoCount > 0 || a.isDeployed) && (
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {a.hasDescription && <Tag label="✦ Description" />}
                  {a.hasCover       && <Tag label="✦ Banner" />}
                  {a.hasPortrait    && <Tag label="✦ Portrait" />}
                  {a.photoCount > 0 && <Tag label={`✦ ${a.photoCount} Photo${a.photoCount !== 1 ? 's' : ''}`} />}
                  {a.isDeployed     && <Tag label="✦ Deployed" colour="#7a9e7e" />}
                </div>
              )}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {a.ownerUsername ?? '—'}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              {a.unitCount}
            </div>
            <div><ScoreBadge score={a.score} /></div>
            <div style={{ fontSize: '0.8rem' }}>
              <span title={a.activityLabel}>{a.activityDot}</span>
              <span style={{ marginLeft: '0.35rem', color: a.activityColor, fontSize: '0.72rem' }}>
                {a.activityLabel}
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {a.lastActiveIso
                ? new Date(a.lastActiveIso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {a.updated_at
                ? new Date(a.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'}
            </div>
            <div>
              <Link href={`/armies/${a.id}`} style={{
                fontFamily: 'var(--font-display)', fontSize: '0.54rem', letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'var(--text-gold)', textDecoration: 'none',
              }}>View ↗</Link>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
