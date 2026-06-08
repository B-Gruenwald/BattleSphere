'use client';

import { useState } from 'react';
import Link from 'next/link';

const labelStyle = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.6rem',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--text-gold)',
};

export default function ArmyBattleHistory({ armyId, battles }) {
  const [open, setOpen] = useState(false);

  if (!battles || battles.length === 0) return null;

  const wins   = battles.filter(b => { const isP1 = b.army_id_p1 === armyId; const myId = isP1 ? b.attacker_faction_id : b.defender_faction_id; return b.winner_faction_id === myId; }).length;
  const losses = battles.filter(b => { const isP1 = b.army_id_p1 === armyId; const myId = isP1 ? b.attacker_faction_id : b.defender_faction_id; return b.winner_faction_id && b.winner_faction_id !== myId; }).length;
  const draws  = battles.length - wins - losses;

  return (
    <div style={{ border: '1px solid var(--border-dim)', marginBottom: '1.25rem' }}>
      {/* Collapsible header */}
      <div
        onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.25rem', cursor: 'pointer', userSelect: 'none', flexWrap: 'wrap', gap: '0.5rem' }}
      >
        <h2 style={{ ...labelStyle, margin: 0 }}>
          {open ? '▾' : '▸'} Battle Record
          <span style={{ fontWeight: 'normal', opacity: 0.6, marginLeft: '0.5em' }}>({battles.length})</span>
        </h2>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.48rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          {wins}W · {draws}D · {losses}L
        </span>
      </div>

      {open && (
        <div style={{ padding: '0 1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {battles.map(b => {
            const isP1         = b.army_id_p1 === armyId;
            const myFaction    = isP1 ? b.attackerFaction : b.defenderFaction;
            const oppFaction   = isP1 ? b.defenderFaction : b.attackerFaction;
            const myFactionId  = isP1 ? b.attacker_faction_id : b.defender_faction_id;
            const result       = !b.winner_faction_id ? 'draw' : b.winner_faction_id === myFactionId ? 'win' : 'loss';
            const resultColour = result === 'win' ? '#6abf6a' : result === 'loss' ? '#e05a5a' : 'var(--text-muted)';
            const resultLabel  = result === 'win' ? 'Victory' : result === 'loss' ? 'Defeat' : 'Draw';
            return (
              <Link key={b.id} href={`/c/${b.campaign?.slug}/battle/${b.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.9rem', border: '1px solid var(--border-dim)', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: resultColour, minWidth: '3.5rem' }}>
                    {resultLabel}
                  </span>
                  <span style={{ flex: 1, fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: '600', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.headline || `${myFaction?.name ?? '—'} vs ${oppFaction?.name ?? '—'}`}
                  </span>
                  {b.campaign && (
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.48rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      {b.campaign.name}
                    </span>
                  )}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                    {new Date(b.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
