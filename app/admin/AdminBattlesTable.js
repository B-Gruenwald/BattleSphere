'use client'
import { useState } from 'react'
import Link from 'next/link'

// Each row: { id, campaignName, campaignSlug, attackerUsername, defenderUsername,
//             result, hasNarrative, hasHeadline, photoCount, score, created_at }

const colHeaderStyle = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.54rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
}
const sortableStyle = { ...colHeaderStyle, cursor: 'pointer', userSelect: 'none' }

const TAG = {
  display: 'inline-block',
  fontSize: '0.68rem',
  color: 'var(--text-gold)',
  marginTop: '0.15rem',
  marginRight: '0.35rem',
}

const COLS = '1.6fr 1fr 1fr 70px 74px 130px 70px'

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

function fmtResult(result) {
  if (!result) return '—'
  if (result === 'attacker_wins') return 'Attacker wins'
  if (result === 'defender_wins') return 'Defender wins'
  if (result === 'draw') return 'Draw'
  return result
}

export default function AdminBattlesTable({ rows }) {
  const [sortKey, setSortKey] = useState('score')
  const [sortDir, setSortDir] = useState('desc')

  function toggleSort(key) {
    if (sortKey === key) { setSortDir(d => d === 'desc' ? 'asc' : 'desc') }
    else { setSortKey(key); setSortDir('desc') }
  }

  const sorted = [...(rows || [])].sort((a, b) => {
    let av, bv
    if (sortKey === 'score') { av = a.score; bv = b.score }
    else { av = new Date(a.created_at).getTime(); bv = new Date(b.created_at).getTime() }
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
        <span style={colHeaderStyle}>Campaign</span>
        <span style={colHeaderStyle}>Attacker</span>
        <span style={colHeaderStyle}>Defender</span>
        <span style={colHeaderStyle}>Result</span>
        <span style={sortableStyle} onClick={() => toggleSort('score')} title="Sort by engagement score">
          Score{sortLabel('score')}
        </span>
        <span style={sortableStyle} onClick={() => toggleSort('date')} title="Sort by date">
          Date{sortLabel('date')}
        </span>
        <span style={colHeaderStyle}></span>
      </div>

      {sorted.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          No battles found.
        </div>
      ) : (
        sorted.map(b => (
          <div key={b.id} style={{
            display: 'grid', gridTemplateColumns: COLS, gap: '1rem',
            padding: '0.85rem 1.25rem',
            borderBottom: '1px solid var(--border-dim)',
            alignItems: 'center',
          }}>
            {/* Campaign + content tags */}
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {b.campaignName ?? <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}
              </div>
              {(b.hasHeadline || b.hasNarrative || b.photoCount > 0) && (
                <div style={{ marginTop: '0.2rem' }}>
                  {b.hasHeadline  && <span style={TAG}>✦ Background</span>}
                  {b.hasNarrative && <span style={TAG}>✦ Chronicle</span>}
                  {b.photoCount > 0 && <span style={TAG}>✦ {b.photoCount} {b.photoCount === 1 ? 'Picture' : 'Pictures'}</span>}
                </div>
              )}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {b.attackerUsername ?? '—'}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {b.defenderUsername ?? '—'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {fmtResult(b.result)}
            </div>
            <div><ScoreBadge score={b.score} /></div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {new Date(b.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            <div>
              {b.campaignSlug ? (
                <Link href={`/c/${b.campaignSlug}/battle/${b.id}`} style={{
                  fontFamily: 'var(--font-display)', fontSize: '0.54rem', letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: '#e05a5a', textDecoration: 'none',
                }}>View →</Link>
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
