'use client';

import Link from 'next/link';
import { useState } from 'react';

function FactionRow({ faction, index, slug }) {
  const [hovered, setHovered] = useState(false);
  const s = faction.stats;

  return (
    <Link href={`/c/${slug}/faction/${faction.id}`} style={{ textDecoration: 'none' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 60px 60px 60px 60px 80px',
          gap: '0.5rem',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border-dim)',
          background: hovered ? 'var(--surface-2)' : 'transparent',
          transition: 'background 0.15s',
          cursor: 'pointer',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Faction name + colour */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {index === 0 && s.wins > 0 && (
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.5rem', letterSpacing: '0.1em', color: 'var(--text-gold)', marginRight: '0.25rem' }}>
              ◆
            </span>
          )}
          <div style={{ width: '12px', height: '12px', background: faction.colour, transform: 'rotate(45deg)', flexShrink: 0 }} />
          <span style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>{faction.name}</span>
        </div>

        {/* W / D / L / Played / Territories */}
        {[s.wins, s.draws, s.losses, s.played, s.controlled].map((val, j) => (
          <span key={j} style={{
            textAlign: 'center',
            fontSize: '0.95rem',
            color: j === 0 && val > 0 ? faction.colour
              : j === 2 && val > 0 ? '#e05a5a'
              : 'var(--text-secondary)',
            fontWeight: j === 0 ? '700' : '400',
          }}>
            {val}
          </span>
        ))}
      </div>
    </Link>
  );
}

export default function FactionStandingsTable({ factions, slug }) {
  if (!factions || factions.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No factions in this campaign yet.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Table header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 60px 60px 60px 60px 80px',
        gap: '0.5rem',
        padding: '0.6rem 1.25rem',
        borderBottom: '1px solid var(--border-dim)',
      }}>
        {['Faction', 'W', 'D', 'L', 'Played', 'Territories'].map(h => (
          <span key={h} style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.55rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            textAlign: h === 'Faction' ? 'left' : 'center',
          }}>
            {h}
          </span>
        ))}
      </div>

      {factions.map((faction, i) => (
        <FactionRow key={faction.id} faction={faction} index={i} slug={slug} />
      ))}
    </div>
  );
}
