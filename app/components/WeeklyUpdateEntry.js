'use client';

import { useState } from 'react';

// Labels and colour accents per update type
const TYPE_META = {
  hobby_progress: {
    label:    'Deployment Report',
    sublabel: 'Hobby Progress',
    accent:   '#6a8fc7',       // blue — new models on the table
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="#6a8fc7" strokeWidth="1.4" opacity="0.7"/>
        <path d="M5 8.5L7.5 11L11 5.5" stroke="#6a8fc7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  army_progress: {
    label:    'Crusade Report',
    sublabel: 'Crusade Progress',
    accent:   '#8a6fc7',       // purple — honours and advancement
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 2L10 6H14L11 9L12 13L8 11L4 13L5 9L2 6H6L8 2Z" fill="#8a6fc7" opacity="0.7"/>
      </svg>
    ),
  },
};

// Format a week range as "14 Apr – 20 Apr" or "28 Apr – 4 May"
function formatWeekRange(weekStart, weekEnd) {
  const opts = { day: 'numeric', month: 'short' };
  const s = new Date(weekStart).toLocaleDateString('en-GB', opts);
  const e = new Date(weekEnd).toLocaleDateString('en-GB', opts);
  return `${s} – ${e}`;
}

// PREVIEW_COUNT: players shown before "show more" kicks in
const PREVIEW_COUNT = 2;

export default function WeeklyUpdateEntry({ update }) {
  const [expanded, setExpanded] = useState(false);

  const meta     = TYPE_META[update.update_type] ?? TYPE_META.hobby_progress;
  const content  = Array.isArray(update.content) ? update.content : [];
  const weekRange = formatWeekRange(update.week_start, update.week_end);
  const hasMore   = content.length > PREVIEW_COUNT;
  const visible   = expanded ? content : content.slice(0, PREVIEW_COUNT);
  const hiddenCount = content.length - PREVIEW_COUNT;

  // Summary chip: "3 players" or "1 player"
  const playerCount = content.length;
  const summaryText = `${playerCount} player${playerCount !== 1 ? 's' : ''}`;

  return (
    <div style={{
      padding: '1.25rem 1.5rem',
      background: `${meta.accent}08`,
      border: '1px solid var(--border-dim)',
      borderLeft: `3px solid ${meta.accent}`,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        {/* Icon */}
        <div style={{ flexShrink: 0, paddingTop: '0.25rem' }}>
          {meta.icon}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Type label */}
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.52rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}>
              {meta.sublabel}
            </span>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.5rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: meta.accent,
              border: `1px solid ${meta.accent}40`,
              padding: '0.1rem 0.4rem',
            }}>
              Week of {weekRange}
            </span>
          </div>

          {/* Title */}
          <div style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: '600', marginBottom: '0.35rem' }}>
            {meta.label}
          </div>

          {/* Summary chip */}
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.55rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: meta.accent,
            marginBottom: '0.8rem',
          }}>
            {summaryText}
          </div>

          {/* Player lines */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {visible.map((player) => (
              <div key={player.player_id} style={{
                borderLeft: `2px solid ${meta.accent}30`,
                paddingLeft: '0.75rem',
              }}>
                <div style={{
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.2rem',
                }}>
                  {player.username}
                </div>
                {player.lines.map((line, i) => (
                  <div key={i} style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                    fontStyle: 'italic',
                  }}>
                    · {line}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Show more / collapse toggle */}
          {hasMore && (
            <button
              onClick={() => setExpanded(v => !v)}
              style={{
                marginTop: '0.75rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-display)',
                fontSize: '0.55rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: meta.accent,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              {expanded
                ? '▲ Collapse'
                : `▼ Show ${hiddenCount} more player${hiddenCount !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
