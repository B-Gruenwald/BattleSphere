'use client';

import Link from 'next/link';
import { useState } from 'react';

const SYSTEM_ICON = {
  'Warhammer 40K':      '☩',
  'Warhammer 40,000':   '☩',
  'Age of Sigmar':      '⚔',
  'Horus Heresy':       '☩',
  'Middle-earth':       '◈',
  'Kings of War':       '⚜',
  'Bolt Action':        '✦',
};

export default function ArmyCard({ army }) {
  const [hovered, setHovered] = useState(false);

  const icon    = SYSTEM_ICON[army.game_system] || '◆';
  const badge   = army.faction_name || army.game_system || null;
  const subtitle = [army.game_system, army.faction_name].filter(Boolean).join(' · ');

  return (
    <Link href={`/armies/${army.id}`} style={{ textDecoration: 'none' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          border: `1px solid ${hovered ? 'var(--gold)' : 'var(--border-dim)'}`,
          padding: '1.75rem',
          background: 'rgba(255,255,255,0.02)',
          cursor: 'pointer',
          transition: 'border-color 0.2s',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '1.25rem', opacity: 0.7 }}>
            {icon}
          </span>
          {badge && (
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.55rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-dim)',
              padding: '0.2rem 0.5rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '55%',
            }}>
              {badge}
            </span>
          )}
        </div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.35rem', letterSpacing: '0.04em' }}>
          {army.name}
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
          {subtitle || 'Army'}
        </p>
        {army.tagline && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '0.5rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            "{army.tagline}"
          </p>
        )}
      </div>
    </Link>
  );
}
