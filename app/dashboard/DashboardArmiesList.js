'use client'
import { useState, useEffect } from 'react'
import ArmyCard from '@/app/components/ArmyCard'
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

export default function DashboardArmiesList({ armies, userId }) {
  const storageKey = `bs_army_order_${userId}`

  // Initialise order from localStorage, falling back to server order
  const [orderedIds, setOrderedIds] = useState(() => armies.map(a => a.id))

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]')
      if (saved.length > 0) {
        // Merge: saved order first, then any new armies not yet in saved
        const knownIds  = new Set(armies.map(a => a.id))
        const validSaved = saved.filter(id => knownIds.has(id))
        const newIds    = armies.map(a => a.id).filter(id => !validSaved.includes(id))
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

  const armyMap = Object.fromEntries(armies.map(a => [a.id, a]))
  const ordered = orderedIds.map(id => armyMap[id]).filter(Boolean)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', margin: 0, lineHeight: 1 }}>
          My Armies
        </h2>
        <Link href="/armies/new" style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none', lineHeight: 1 }}>
          + New
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {ordered.map((army, i) => (
          <div key={army.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <ArmyCard army={army} />
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
      </div>
    </div>
  )
}
