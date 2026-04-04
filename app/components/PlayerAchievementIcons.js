'use client';

import { useRouter } from 'next/navigation';

export default function PlayerAchievementIcons({ achievements, achievementsHref }) {
  const router = useRouter();
  if (!achievements || achievements.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
      {achievements.map(a => (
        <span
          key={a.id}
          title={a.title}
          onClick={e => { e.preventDefault(); e.stopPropagation(); router.push(achievementsHref); }}
          style={{
            cursor: 'pointer',
            fontSize: '1rem',
            lineHeight: 1,
            display: 'inline-block',
          }}
        >
          {a.icon}
        </span>
      ))}
    </div>
  );
}
