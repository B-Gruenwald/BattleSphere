import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata = {
  title: 'Army Portfolios',
  description:
    'Browse painted wargaming armies on BattleSphere — Warhammer 40,000, Age of Sigmar, and beyond. View unit rosters, Crusade records, and photo galleries.',
};

export default async function ArmiesDirectoryPage() {
  const admin = createAdminClient();

  // Fetch all public armies
  const { data: armies } = await admin
    .from('armies')
    .select('*')
    .eq('is_public', true);

  if (!armies || armies.length === 0) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2.5rem 2rem', color: 'var(--text-primary)' }}>
        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No armies yet.</p>
      </div>
    );
  }

  // Fetch unit counts per army
  const armyIds = armies.map(a => a.id);
  const { data: unitRows } = await admin
    .from('army_units')
    .select('army_id')
    .in('army_id', armyIds);

  const unitCount = {};
  for (const u of (unitRows || [])) {
    unitCount[u.army_id] = (unitCount[u.army_id] || 0) + 1;
  }

  // Fetch player usernames
  const playerIds = [...new Set(armies.map(a => a.player_id).filter(Boolean))];
  const { data: profileRows } = await admin
    .from('profiles')
    .select('id, username')
    .in('id', playerIds);

  const playerName = Object.fromEntries((profileRows || []).map(p => [p.id, p.username]));

  // Sort by unit count descending
  const rows = [...armies].sort((a, b) => (unitCount[b.id] || 0) - (unitCount[a.id] || 0));

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2.5rem 2rem', color: 'var(--text-primary)' }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.6rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--text-gold)',
          marginBottom: '0.6rem',
          opacity: 0.85,
        }}>
          BattleSphere
        </p>
        <h1 style={{
          fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
          fontWeight: 900,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          margin: '0 0 0.75rem',
          lineHeight: 1.1,
        }}>
          Army Portfolios
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0, maxWidth: '560px' }}>
          Painted wargaming armies from BattleSphere players — Warhammer 40,000,
          Age of Sigmar, and beyond. Unit rosters, Crusade records, and photo galleries.
        </p>
      </div>

      {/* ── Army list ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1px',
        background: 'var(--border-dim)',
        border: '1px solid var(--border-dim)',
      }}>
        {rows.map(a => {
          const units   = unitCount[a.id] || 0;
          const player  = playerName[a.player_id] || null;
          const desc    = a.description
            ? a.description.slice(0, 140) + (a.description.length > 140 ? '…' : '')
            : null;

          return (
            <Link
              key={a.id}
              href={`/armies/${a.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{
                background: 'var(--bg-deep)',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '1.5rem',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Gold left accent */}
                <div style={{
                  position: 'absolute',
                  left: 0, top: 0, bottom: 0,
                  width: '2px',
                  background: 'linear-gradient(180deg, var(--gold), transparent)',
                  opacity: 0.4,
                }} />

                {/* Left: info */}
                <div style={{ flex: 1, minWidth: 0 }}>

                  {/* Faction + meta row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    {a.faction_name && (
                      <span style={{
                        display: 'inline-block',
                        fontSize: '0.65rem',
                        fontFamily: 'var(--font-display)',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        padding: '0.2rem 0.55rem',
                        background: 'rgba(183,140,64,0.12)',
                        color: '#b78c40',
                        border: '1px solid rgba(183,140,64,0.3)',
                        borderRadius: '2px',
                      }}>
                        {a.faction_name}
                      </span>
                    )}
                    {player && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        {player}
                      </span>
                    )}
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {`${units} ${units === 1 ? 'unit' : 'units'}`}
                    </span>
                  </div>

                  {/* Army name */}
                  <div style={{
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    letterSpacing: '0.03em',
                    color: 'var(--text-primary)',
                    marginBottom: desc ? '0.4rem' : 0,
                    lineHeight: 1.2,
                  }}>
                    {a.name}
                  </div>

                  {/* Description snippet */}
                  {desc && (
                    <p style={{
                      fontSize: '0.82rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.55,
                      margin: 0,
                      fontStyle: 'italic',
                    }}>
                      {desc}
                    </p>
                  )}
                </div>

                {/* Right: arrow */}
                <div style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-gold)',
                  opacity: 0.7,
                  flexShrink: 0,
                  alignSelf: 'center',
                }}>
                  View →
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Footer link ───────────────────────────────────────────────────── */}
      <div style={{ marginTop: '3rem' }}>
        <Link href="/" style={{ fontSize: '0.82rem', color: 'var(--text-gold)', textDecoration: 'none', opacity: 0.75 }}>
          ← Back to BattleSphere
        </Link>
      </div>

    </div>
  );
}
