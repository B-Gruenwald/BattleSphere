import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import CampaignMap from '@/app/components/CampaignMap';
import JoinRequestButton from './JoinRequestButton';

const SETTING_LABELS = {
  'Gothic Sci-Fi': 'Gothic Sci-Fi',
  'Space Opera':   'Space Opera',
  'High Fantasy':  'High Fantasy',
  'Historical':    'Historical',
  'Custom':        'Custom Setting',
};

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

// ── Chronicle entry renderers (non-clickable, public-safe) ────────────────────

function PublicBattleEntry({ battle, factionMap }) {
  const attacker  = factionMap[battle.attacker_faction_id];
  const defender  = factionMap[battle.defender_faction_id];
  const winner    = factionMap[battle.winner_faction_id];
  const isDraw    = !battle.winner_faction_id;
  const attackerWon = battle.winner_faction_id === battle.attacker_faction_id;
  const resultLabel = isDraw
    ? 'Draw'
    : attackerWon
      ? `${attacker?.name ?? '?'} Victory`
      : `${defender?.name ?? '?'} Victory`;
  const resultColour = isDraw ? 'var(--text-muted)' : (winner?.colour ?? 'var(--text-gold)');

  return (
    <div style={{
      display: 'flex',
      gap: '1.25rem',
      alignItems: 'flex-start',
      padding: '1.25rem 1.5rem',
      background: 'var(--bg-raised)',
      border: '1px solid var(--border-dim)',
      borderLeft: `3px solid ${resultColour}`,
    }}>
      <div style={{ flexShrink: 0, paddingTop: '0.3rem' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 2L14 8L8 14L2 8Z" fill={resultColour} opacity="0.8"/>
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: '0.52rem',
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--text-muted)', marginBottom: '0.3rem',
        }}>
          Battle
        </div>
        <div style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: '600', marginBottom: '0.35rem' }}>
          {attacker?.name ?? '?'}
          <span style={{ color: 'var(--text-muted)', fontWeight: '400', margin: '0 0.5rem' }}>vs</span>
          {defender?.name ?? '?'}
        </div>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: '0.55rem',
          letterSpacing: '0.1em', textTransform: 'uppercase', color: resultColour,
        }}>
          {resultLabel}
        </span>
        {battle.chronicle && (
          <p style={{
            color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic',
            marginTop: '0.6rem', lineHeight: 1.55,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {battle.chronicle}
          </p>
        )}
      </div>
    </div>
  );
}

function PublicEventEntry({ ev }) {
  const statusColour = ev.status === 'active' ? '#b78c40' : ev.status === 'upcoming' ? '#6a8fc7' : '#5a5445';
  return (
    <div style={{
      display: 'flex',
      gap: '1.25rem',
      alignItems: 'flex-start',
      padding: '1.25rem 1.5rem',
      background: 'rgba(183,140,64,0.04)',
      border: '1px solid var(--border-dim)',
      borderLeft: `3px solid ${statusColour}`,
    }}>
      <div style={{ flexShrink: 0, paddingTop: '0.2rem' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="12" height="12" rx="1" fill={statusColour} opacity="0.7"/>
          <path d="M5 8H11M8 5V11" stroke="var(--bg-void)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: '0.52rem',
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--text-muted)', marginBottom: '0.3rem',
        }}>
          Campaign Event
        </div>
        <div style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: '600', marginBottom: '0.35rem' }}>
          {ev.title}
        </div>
        {ev.body && (
          <p style={{
            color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic',
            lineHeight: 1.55, overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {ev.body}
          </p>
        )}
      </div>
    </div>
  );
}

function PublicAchievementEntry({ achievement, factionMap, profileMap }) {
  let recipientName = '?';
  if (achievement.awarded_to_type === 'player') {
    recipientName = profileMap[achievement.awarded_to_player_id]?.display_name
      || profileMap[achievement.awarded_to_player_id]?.username
      || '?';
  } else if (achievement.awarded_to_type === 'faction') {
    recipientName = factionMap[achievement.awarded_to_faction_id]?.name ?? '?';
  }

  return (
    <div style={{
      display: 'flex',
      gap: '1.25rem',
      alignItems: 'flex-start',
      padding: '1.25rem 1.5rem',
      background: 'rgba(183,140,64,0.06)',
      border: '1px solid var(--border-dim)',
      borderLeft: '3px solid var(--text-gold)',
    }}>
      <div style={{ flexShrink: 0, fontSize: '1.1rem', lineHeight: 1, paddingTop: '0.1rem' }}>
        {achievement.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: '0.52rem',
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--text-muted)', marginBottom: '0.3rem',
        }}>
          Achievement
        </div>
        <div style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: '600', marginBottom: '0.35rem' }}>
          {achievement.title}
        </div>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: '0.55rem',
          letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-gold)',
        }}>
          Awarded to {recipientName}
        </span>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function PublicCampaignPage({ params }) {
  const { slug } = await params;
  const supabase = await createClient();

  // Fetch campaign — no auth check; relies on public RLS policy
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!campaign) notFound();

  // Check current user (may be null for unauthenticated visitors)
  const { data: { user } } = await supabase.auth.getUser();

  // Parallel data fetches
  const [
    { data: factions },
    { data: territories },
    { data: influenceData },
    { data: allBattles },
    { data: recentBattles },
    { data: recentEvents },
    { data: recentAchievements },
    { count: memberCount },
    { count: battleCount },
  ] = await Promise.all([
    supabase.from('factions').select('*').eq('campaign_id', campaign.id).order('created_at'),
    supabase.from('territories').select('*').eq('campaign_id', campaign.id),
    supabase.from('territory_influence').select('*').eq('campaign_id', campaign.id),
    supabase.from('battles')
      .select('attacker_faction_id, defender_faction_id, winner_faction_id')
      .eq('campaign_id', campaign.id),
    supabase.from('battles').select('*').eq('campaign_id', campaign.id)
      .order('created_at', { ascending: false }).limit(8),
    supabase.from('campaign_events').select('*').eq('campaign_id', campaign.id)
      .order('created_at', { ascending: false }).limit(8),
    supabase.from('achievements').select('*').eq('campaign_id', campaign.id)
      .order('created_at', { ascending: false }).limit(8),
    supabase.from('campaign_members')
      .select('*', { count: 'exact', head: true }).eq('campaign_id', campaign.id),
    supabase.from('battles')
      .select('*', { count: 'exact', head: true }).eq('campaign_id', campaign.id),
  ]);

  // Fetch profiles for achievement player recipients
  const achievementPlayerIds = [...new Set(
    (recentAchievements || [])
      .filter(a => a.awarded_to_type === 'player' && a.awarded_to_player_id)
      .map(a => a.awarded_to_player_id)
  )];
  const { data: achievementProfiles } = achievementPlayerIds.length > 0
    ? await supabase.from('profiles').select('id, display_name, username').in('id', achievementPlayerIds)
    : { data: [] };

  // Check membership + join request status for current user
  let isMember = false;
  let existingRequest = null;

  if (user) {
    const { data: membership } = await supabase
      .from('campaign_members')
      .select('user_id')
      .eq('campaign_id', campaign.id)
      .eq('user_id', user.id)
      .maybeSingle();

    isMember = !!membership;

    if (!isMember) {
      const { data: reqData } = await supabase
        .from('join_requests')
        .select('status')
        .eq('campaign_id', campaign.id)
        .eq('user_id', user.id)
        .maybeSingle();
      existingRequest = reqData || null;
    }
  }

  // ── Compute faction standings ──────────────────────────────────────────────
  const factionMap   = Object.fromEntries((factions || []).map(f => [f.id, f]));
  const profileMap   = Object.fromEntries((achievementProfiles || []).map(p => [p.id, p]));

  const factionsWithStats = (factions || []).map(f => {
    const battles    = allBattles || [];
    const participated = battles.filter(b =>
      b.attacker_faction_id === f.id || b.defender_faction_id === f.id
    );
    const wins       = participated.filter(b => b.winner_faction_id === f.id).length;
    const draws      = participated.filter(b => b.winner_faction_id === null).length;
    const losses     = participated.filter(b =>
      b.winner_faction_id !== null && b.winner_faction_id !== f.id
    ).length;
    const controlled = (territories || []).filter(t =>
      t.controlling_faction_id === f.id && !t.parent_id
    ).length;
    return { ...f, stats: { wins, draws, losses, played: wins + draws + losses, controlled } };
  }).sort((a, b) => b.stats.wins - a.stats.wins);

  // ── Build chronicle timeline ───────────────────────────────────────────────
  const chronicle = [
    ...(recentBattles     || []).map(b => ({ type: 'battle',      sortKey: b.created_at, data: b })),
    ...(recentEvents      || []).map(e => ({ type: 'event',       sortKey: e.created_at, data: e })),
    ...(recentAchievements|| []).map(a => ({ type: 'achievement', sortKey: a.created_at, data: a })),
  ]
    .sort((a, b) => new Date(b.sortKey) - new Date(a.sortKey))
    .slice(0, 10);

  const topLevelTerritoryCount = (territories || []).filter(t => !t.parent_id).length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)' }}>

      {/* ── Public banner ─────────────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(183,140,64,0.06)',
        borderBottom: '1px solid rgba(183,140,64,0.18)',
        padding: '0.6rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.55rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--text-gold)',
          opacity: 0.7,
        }}>
          ◆ Public Campaign Page
        </span>
        {isMember && (
          <Link href={`/c/${slug}`} style={{ textDecoration: 'none' }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.55rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--text-gold)',
            }}>
              Go to Campaign Dashboard →
            </span>
          </Link>
        )}
      </div>

      {/* ── Campaign header + Stats (constrained width) ──────────────────────── */}
      <div style={{ padding: '4rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>

        {/* ── Campaign header ───────────────────────────────────────────────── */}
        <div style={{ marginBottom: '3rem' }}>
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.2em',
            textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.75rem',
          }}>
            {SETTING_LABELS[campaign.setting] || campaign.setting}
          </p>
          <h1 style={{
            fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: '900',
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            {campaign.name}
          </h1>
          {campaign.description && (
            <p style={{
              color: 'var(--text-secondary)', fontStyle: 'italic',
              marginTop: '0.75rem', maxWidth: '600px', lineHeight: 1.6,
            }}>
              {campaign.description}
            </p>
          )}
        </div>

        {/* ── Stats strip ───────────────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          borderTop: '1px solid var(--border-dim)',
          borderBottom: '1px solid var(--border-dim)',
        }}>
          {[
            { label: 'Factions',    value: factions?.length ?? 0 },
            { label: 'Players',     value: memberCount ?? 0 },
            { label: 'Territories', value: topLevelTerritoryCount },
            { label: 'Battles',     value: battleCount ?? 0 },
          ].map((stat, i, arr) => (
            <div key={stat.label} style={{
              padding: '1.5rem 1rem', textAlign: 'center',
              borderRight: i < arr.length - 1 ? '1px solid var(--border-dim)' : 'none',
            }}>
              <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                {stat.value}
              </div>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '0.58rem',
                letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)',
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Full-width Map ────────────────────────────────────────────────────── */}
      <div style={{
        borderTop: '1px solid var(--border-dim)',
        borderBottom: '1px solid var(--border-dim)',
        marginBottom: '3rem',
      }}>
        <div style={{
          padding: '0.75rem 2rem',
          borderBottom: '1px solid var(--border-dim)',
          fontFamily: 'var(--font-display)', fontSize: '0.65rem',
          letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)',
        }}>
          Territory Map
        </div>
        <div style={{ height: '65vh', minHeight: '420px', maxHeight: '760px', position: 'relative' }}>
          {territories && territories.length > 0 ? (
            <CampaignMap
              territories={territories}
              factions={factions || []}
              influenceData={influenceData || []}
              campaignSlug={slug}
              setting={campaign.setting}
              readOnly={true}
            />
          ) : (
            <div style={{
              height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem',
            }}>
              No territories mapped yet.
            </div>
          )}
        </div>
      </div>

      {/* ── Standings + Chronicle + CTA (constrained width) ─────────────────── */}
      <div style={{ padding: '0 2rem', maxWidth: '1100px', margin: '0 auto' }}>

        {/* Faction Standings */}
        <div style={{ border: '1px solid var(--border-dim)', marginBottom: '3rem' }}>
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid var(--border-dim)',
              fontFamily: 'var(--font-display)', fontSize: '0.65rem',
              letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)',
            }}>
              Faction Standings
            </div>

            {factionsWithStats.length === 0 ? (
              <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No factions yet.</p>
              </div>
            ) : (
              <div>
                {/* Header row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 50px 50px 50px 50px 70px',
                  gap: '0.5rem',
                  padding: '0.6rem 1.25rem',
                  borderBottom: '1px solid var(--border-dim)',
                }}>
                  {['Faction', 'W', 'D', 'L', 'Played', 'Territories'].map(h => (
                    <span key={h} style={{
                      fontFamily: 'var(--font-display)', fontSize: '0.52rem',
                      letterSpacing: '0.12em', textTransform: 'uppercase',
                      color: 'var(--text-muted)', textAlign: h === 'Faction' ? 'left' : 'center',
                    }}>
                      {h}
                    </span>
                  ))}
                </div>
                {factionsWithStats.map((f, index) => (
                  <div key={f.id} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 50px 50px 50px 50px 70px',
                    gap: '0.5rem',
                    padding: '1rem 1.25rem',
                    borderBottom: '1px solid var(--border-dim)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {index === 0 && f.stats.wins > 0 && (
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.5rem', color: 'var(--text-gold)' }}>◆</span>
                      )}
                      <div style={{ width: '12px', height: '12px', background: f.colour, transform: 'rotate(45deg)', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)' }}>{f.name}</span>
                    </div>
                    {[f.stats.wins, f.stats.draws, f.stats.losses, f.stats.played, f.stats.controlled].map((val, j) => (
                      <span key={j} style={{
                        textAlign: 'center', fontSize: '0.95rem',
                        color: j === 0 && val > 0 ? f.colour
                          : j === 2 && val > 0 ? '#e05a5a'
                          : 'var(--text-secondary)',
                        fontWeight: j === 0 ? '700' : '400',
                      }}>
                        {val}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

        {/* ── Recent Chronicle ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: '0.7rem',
              letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)',
            }}>
              Recent Chronicle
            </h2>
          </div>

          {chronicle.length === 0 ? (
            <div style={{
              border: '1px solid var(--border-dim)', padding: '4rem 2rem',
              textAlign: 'center',
            }}>
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No entries yet. Join to be part of the story.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {chronicle.map((entry, i) => (
                <div key={i}>
                  {entry.type === 'battle' && PublicBattleEntry({ battle: entry.data, factionMap })}
                  {entry.type === 'event'  && PublicEventEntry({ ev: entry.data })}
                  {entry.type === 'achievement' && PublicAchievementEntry({
                    achievement: entry.data, factionMap, profileMap,
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Join CTA ──────────────────────────────────────────────────────── */}
        <div style={{
          border: '1px solid rgba(183,140,64,0.25)',
          background: 'rgba(183,140,64,0.04)',
          padding: '2.5rem',
          textAlign: 'center',
        }}>
          <div style={{
            width: '10px', height: '10px', background: 'var(--text-gold)',
            transform: 'rotate(45deg)', margin: '0 auto 1.5rem',
            opacity: 0.5,
          }} />
          <h2 style={{
            fontSize: 'clamp(1.1rem, 2.5vw, 1.6rem)', fontWeight: '900',
            letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.75rem',
          }}>
            Join the Campaign
          </h2>
          <p style={{
            color: 'var(--text-secondary)', fontStyle: 'italic',
            maxWidth: '480px', margin: '0 auto 2rem', lineHeight: 1.6,
          }}>
            Request access to take part in {campaign.name}. The organiser will review your request.
          </p>
          <JoinRequestButton
            campaignId={campaign.id}
            campaignSlug={slug}
            userId={user?.id ?? null}
            isMember={isMember}
            existingRequest={existingRequest}
          />
        </div>

      </div>
    </div>
  );
}
