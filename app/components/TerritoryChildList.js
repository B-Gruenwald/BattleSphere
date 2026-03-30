'use client';

import Link from 'next/link';
import { useState } from 'react';

function ChildItem({ child, slug, factionColour }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link href={`/c/${slug}/territory/${child.id}`} style={{ textDecoration: 'none' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.6rem 0.75rem',
          border: `1px solid ${hovered ? 'var(--border-subtle)' : 'transparent'}`,
          background: hovered ? 'var(--surface-2)' : 'transparent',
          transition: 'border-color 0.15s, background 0.15s',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div style={{
          width: '8px',
          height: '8px',
          background: factionColour || 'var(--border-dim)',
          transform: 'rotate(45deg)',
          flexShrink: 0,
        }} />
        <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem', flex: 1 }}>{child.name}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>›</span>
      </div>
    </Link>
  );
}

export default function TerritoryChildList({ children, slug, factionMap }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {children.map(child => (
        <ChildItem
          key={child.id}
          child={child}
          slug={slug}
          factionColour={child.controlling_faction_id ? factionMap[child.controlling_faction_id]?.colour : null}
        />
      ))}
    </div>
  );
}
