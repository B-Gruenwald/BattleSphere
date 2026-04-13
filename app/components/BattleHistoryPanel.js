'use client';

import { useState } from 'react';
import Link from 'next/link';

const INITIAL_COUNT = 5;

function calcResult(battle, userId) {
  const isAttacker = battle.attacker_player_id === userId;
  const myFaction  = isAttacker ? battle.attacker_faction_id : battle.defender_faction_id;
  if (!battle.winner_faction_id) return 'draw';
  return battle.winner_faction_id === myFaction ? 'win' : 'loss';
}

export default function BattleHistoryPanel({ battles, factionMap, opponentMap, userId, slug, isOwnProfile }) {
  const [showAll, setShowAll] = useState(false);

  const all       = battles ?? [];
  const displayed = showAll ? all : all.slice(0, INITIAL_COUNT);
  const hidden    = all.length - INITIAL_COUNT;

  return (
    <div style={{ border: '1px solid var(--border-dim)', marginBottom: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0.65rem 1rem', borderBottom: '1px solid var(--border-dim)', background: 'var(--surface-1)' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>
          Recent Battles
        </span>
        {isOwnProfile && (
          <Link href={`/c/${slug}/battle/new`} style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textDecoration: 'none' }}>
            Log battle →
          </Link>
        )}
      </div>

      {/* Battle rows */}
      <div style={{ padding: '0 1rem' }}>
        {all.length === 0 ? (
          <div style={{ padding: '1.5rem 0', textAlign: 'center' }}>
            <div style={{ width: '5px', height: '5px', background: 'var(--gold)', transform: 'rotate(45deg)', margin: '0 auto 0.75rem', opacity: 0.3 }} />
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>No battles recorded yet.</p>
          </div>
        ) : (
          displayed.map((battle, idx) => {
            const isAttacker   = battle.attacker_player_id === userId;
            const myFactionId  = isAttacker ? battle.attacker_faction_id : battle.defender_faction_id;
            const oppFactionId = isAttacker ? battle.defender_faction_id : battle.attacker_faction_id;
            const oppPlayerId  = isAttacker ? battle.defender_player_id : battle.attacker_player_id;
            const myFaction    = factionMap[myFactionId];
            const oppFaction   = factionMap[oppFactionId];
            const oppPlayer    = opponentMap[oppPlayerId];
            const result       = calcResult(battle, userId);
            const resultLabel  = result === 'win' ? 'Victory' : result === 'draw' ? 'Draw' : 'Defeat';
            const resultColour = result === 'win'
              ? (myFaction?.colour || 'var(--text-gold)')
              : result === 'draw' ? 'var(--text-muted)' : '#e05a5a';
            const myScore    = isAttacker ? battle.attacker_score : battle.defender_score;
            const theirScore = isAttacker ? battle.defender_score : battle.attacker_score;
            const hasScores  = battle.attacker_score > 0 || battle.defender_score > 0;
            const date       = new Date(battle.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

            return (
              <Link
                key={battle.id}
                href={`/c/${slug}/battle/${battle.id}`}
                style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.6rem 0', borderBottom: idx < displayed.length - 1 ? '1px solid var(--border-dim)' : 'none', cursor: 'pointer' }}
              >
                <div style={{ width: '5px', height: '5px', background: resultColour, transform: 'rotate(45deg)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.83rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <span style={{ color: myFaction?.colour || 'var(--text-secondary)' }}>{myFaction?.name ?? '?'}</span>
                    <span style={{ color: 'var(--text-muted)' }}> vs </span>
                    <span style={{ color: oppFaction?.colour || 'var(--text-secondary)' }}>{oppFaction?.name ?? '?'}</span>
                    {oppPlayer && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}> · {oppPlayer.username}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.1rem', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.48rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: resultColour }}>
                      {resultLabel}
                    </span>
                    {hasScores && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{myScore}–{theirScore}</span>
                    )}
                  </div>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', flexShrink: 0 }}>{date} →</span>
              </Link>
            );
          })
        )}
      </div>

      {/* Show all / collapse */}
      {all.length > INITIAL_COUNT && (
        <div style={{ padding: '0.5rem 1rem', borderTop: '1px solid var(--border-dim)' }}>
          <button
            onClick={() => setShowAll(s => !s)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.72rem', cursor: 'pointer', padding: 0, width: '100%', textAlign: 'right' }}
          >
            {showAll ? '↑ Show fewer' : `See all ${all.length} battles →`}
          </button>
        </div>
      )}
    </div>
  );
}
