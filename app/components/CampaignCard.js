'use client';

import Link from 'next/link';
import { useState } from 'react';

const SETTING_ICON = {
  'Gothic Sci-Fi': '☩',
  'Space Opera': '✦',
  'High Fantasy': '⚔',
  'Historical': '⚜',
  'Custom': '◈',
};

export default function CampaignCard({ campaign }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link href={`/c/${campaign.slug}`} style={{ textDecoration: 'none' }}>
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
            {SETTING_ICON[campaign.setting] || '◈'}
          </span>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.55rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: campaign.role === 'Organiser' ? 'var(--text-gold)' : 'var(--text-muted)',
            border: '1px solid',
            borderColor: campaign.role === 'Organiser' ? 'var(--gold)' : 'var(--border-dim)',
            padding: '0.2rem 0.5rem',
          }}>
            {campaign.role}
          </span>
        </div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.35rem', letterSpacing: '0.04em' }}>
          {campaign.name}
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
          {campaign.setting}
        </p>
      </div>
    </Link>
  );
}
