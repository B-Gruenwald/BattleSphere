'use client';

import { useState } from 'react';
import Link from 'next/link';
import SetFactionForm from './SetFactionForm';

export default function FactionChangeInline({
  assignedFaction,
  slug,
  campaignId,
  currentFactionId,
  factions,
  isOwnProfile,
}) {
  const [changing, setChanging] = useState(false);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
      {assignedFaction ? (
        <>
          <div style={{ width: '8px', height: '8px', background: assignedFaction.colour, transform: 'rotate(45deg)', flexShrink: 0 }} />
          <Link href={`/c/${slug}/faction/${assignedFaction.id}`} style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '600', color: assignedFaction.colour }}>
              {assignedFaction.name}
            </span>
          </Link>
        </>
      ) : (
        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>No faction assigned</span>
      )}

      {isOwnProfile && (
        <button
          onClick={() => setChanging(c => !c)}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.62rem', cursor: 'pointer', padding: 0, textDecoration: 'underline dotted', lineHeight: 1 }}
        >
          {changing ? 'cancel' : 'change'}
        </button>
      )}

      {changing && isOwnProfile && (
        <div style={{ width: '100%', marginTop: '0.5rem' }}>
          <SetFactionForm
            campaignId={campaignId}
            currentFactionId={currentFactionId || ''}
            factions={factions || []}
          />
        </div>
      )}
    </div>
  );
}
