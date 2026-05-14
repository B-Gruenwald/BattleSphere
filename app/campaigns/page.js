import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata = {
  title: 'All Campaigns',
  description:
    'Browse all narrative wargaming campaigns and club leagues running on BattleSphere — for Warhammer 40,000, Age of Sigmar, and beyond.',
  alternates: { canonical: '/campaigns' },
};

const FORMAT_BADGE = {
  league:    { label: 'League',    bg: 'rgba(106,143,199,0.15)', color: '#6a8fc7', border: 'rgba(106,143,199,0.3)' },
  narrative: { label: 'Narrative', bg: 'rgba(183,140,64,0.12)',  color: '#b78c40', border: 'rgba(183,140,64,0.3)'  },
};

const SETTING_LABELS = {
  'Gothic Sci-Fi': 'Gothic Sci-Fi',
  'High Fantasy':  'High Fantasy',
  'Space Opera':   'Space Opera',
  'Historical':    'Historical',
  'Custom':        'Custom',
};

export default async function CampaignsDirectoryPage() {
  const admin = createAdminClient();

  // Only show campaigns that have at least one battle recorded
  const { data: battleRows } = await admin
    .from('battles')
    .select('campaign_id');

  // Count battles per campaign
  const battleCount = {};
  for (const b of (battleRows || [])) {
    battleCount[b.campaign_id] = (battleCount[b.campaign_id] || 0) + 1;
  }

  const activeCampaignIds = Object.keys(battleCount);

  const unsorted = activeCampaignIds.length === 0 ? [] : await admin
    .from('campaigns')
    .select('*')
    .in('id', activeCampaignIds)
    .then(({ data }) => data || []);

  // Sort by battle count descending
  const rows = unsorted.sort((a, b) => (battleCount[b.id] || 0) - (battleCount[a.id] || 0));

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
          All Campaigns
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0, maxWidth: '560px' }}>
          Live narrative campaigns and club leagues running on BattleSphere —
          for Warhammer 40,000, Age of Sigmar, and beyond.
        </p>
      </div>

      {/* ── Campaign list ─────────────────────────────────────────────────── */}
      {rows.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No campaigns yet.</p>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1px',
          background: 'var(--border-dim)',
          border: '1px solid var(--border-dim)',
        }}>
          {rows.map(c => {
            const format   = c.campaign_format === 'league' ? 'league' : 'narrative';
            const badge    = FORMAT_BADGE[format];
            const setting  = SETTING_LABELS[c.setting] || c.setting || null;
            const desc     = c.description
              ? c.description.slice(0, 140) + (c.description.length > 140 ? '…' : '')
              : null;
            const battles  = battleCount[c.id] || 0;

            return (
              <Link
                key={c.id}
                href={`/campaign/${c.slug}`}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{
                        display: 'inline-block',
                        fontSize: '0.65rem',
                        fontFamily: 'var(--font-display)',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        padding: '0.2rem 0.55rem',
                        background: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`,
                        borderRadius: '2px',
                      }}>
                        {badge.label}
                      </span>
                      {setting && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          {setting}
                        </span>
                      )}
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {`${battles} ${battles === 1 ? 'battle' : 'battles'}`}
                      </span>
                    </div>

                    <div style={{
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      letterSpacing: '0.03em',
                      color: 'var(--text-primary)',
                      marginBottom: desc ? '0.4rem' : 0,
                      lineHeight: 1.2,
                    }}>
                      {c.name}
                    </div>

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
                    View
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: '3rem' }}>
        <Link href="/" style={{ fontSize: '0.82rem', color: 'var(--text-gold)', textDecoration: 'none', opacity: 0.75 }}>
          Back to BattleSphere
        </Link>
      </div>

    </div>
  );
}
