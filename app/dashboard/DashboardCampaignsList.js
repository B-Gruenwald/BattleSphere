'use client'
import { useState, useEffect } from 'react'
import CampaignCard from '@/app/components/CampaignCard'
import Link from 'next/link'

const arrowBtn = (disabled) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '22px',
  height: '22px',
  background: 'none',
  border: '1px solid var(--border-dim)',
  color: disabled ? 'var(--border-dim)' : 'var(--text-muted)',
  cursor: disabled ? 'default' : 'pointer',
  fontSize: '0.7rem',
  lineHeight: 1,
  padding: 0,
  borderRadius: '3px',
  transition: 'border-color 0.15s, color 0.15s',
  flexShrink: 0,
})

const AUSTRIACUS_SLUG = 'austriacus-subsector-93n4g'

export default function DashboardCampaignsList({ campaigns, userId, isAustriacusMember }) {
  const storageKey = `bs_campaign_order_${userId}`

  const [orderedIds, setOrderedIds] = useState(() => campaigns.map(c => c.id))

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]')
      if (saved.length > 0) {
        const knownIds   = new Set(campaigns.map(c => c.id))
        const validSaved = saved.filter(id => knownIds.has(id))
        const newIds     = campaigns.map(c => c.id).filter(id => !validSaved.includes(id))
        setOrderedIds([...validSaved, ...newIds])
      }
    } catch (_) {}
  }, [])

  function move(index, dir) {
    const next = [...orderedIds]
    const swap = index + dir
    ;[next[index], next[swap]] = [next[swap], next[index]]
    setOrderedIds(next)
    try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch (_) {}
  }

  const campaignMap = Object.fromEntries(campaigns.map(c => [c.id, c]))
  const ordered     = orderedIds.map(id => campaignMap[id]).filter(Boolean)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', margin: 0, lineHeight: 1 }}>
          My Campaigns
        </h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {ordered.map((c, i) => (
          <div key={c.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <CampaignCard campaign={c} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4px' }}>
              <button
                onClick={() => move(i, -1)}
                disabled={i === 0}
                style={arrowBtn(i === 0)}
                title="Move up"
              >↑</button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === ordered.length - 1}
                style={arrowBtn(i === ordered.length - 1)}
                title="Move down"
              >↓</button>
            </div>
          </div>
        ))}

        {/* Austriacus promo strip — not reorderable, always at bottom */}
        {!isAustriacusMember && (
          <div style={{ border: '1px solid rgba(183,140,64,0.25)', background: 'rgba(183,140,64,0.04)', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.35rem' }}>
                Open Narrative Campaign
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                The Austriacus Subsector is open to all — join an active campaign and see the platform in action.
              </p>
            </div>
            <Link href={`/campaign/${AUSTRIACUS_SLUG}`} style={{ flexShrink: 0 }}>
              <button className="btn-primary" style={{ background: 'var(--gold)', color: '#07070a', border: '1px solid var(--gold)', padding: '0.5rem 1.25rem', fontWeight: '700', fontSize: '0.78rem', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                Join →
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
