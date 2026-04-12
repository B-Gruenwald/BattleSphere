import { notFound }    from 'next/navigation';
import Link             from 'next/link';
import { createClient } from '@/lib/supabase/server';
import CampaignMap      from '@/app/components/CampaignMap';
import BulletinPanel    from '@/app/components/BulletinPanel';
import EventCardBody    from '@/app/components/EventCardBody';
import PublicAccessCTA  from './PublicAccessCTA';
import { calcPlayerXP, getXPRank } from '@/app/lib/xp';

const SETTING_LABELS = {
  'Gothic Sci-Fi': 'Gothic Sci-Fi',
  'Space Opera':   'Space Opera',
  'High Fantasy':  'High Fantasy',
  'Historical':    'Historical',
  'Custom':        'Custom Setting',
};

const STATUS_COLOURS = {
  upcoming: '#6a8fc7',
  active:   '#b78c40',
  resolved: '#5a5445',
};

export default async function PublicCampaignPage({ params }) {
  const { slug } = await params;
  const supabase = await createClient();

  // ── Campaign (public RLS) ────────────────────────────────────────────────────
  const { data: campaign } = await supabase
    .from('campaigns').select('*').eq('slug', slug).single();

  if (!campaign) notFound();

  // ── Current user (may be null) ───────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser();

  // ── Parallel data fetches ────────────────────────────────────────────────────
  const [
    { data: factions },
    { data: territories },
    { data: influenceData },
    { data: warpRoutes },
    { data: allBattles },
    { data: activeEvents },
    { data: recentBattles },
    { data: recentEvents },
    { data: recentAchievements },
    { count: memberCount },
    { count: battleCount },
    { count: activeEventCount },
  ] = await Promise.all([
    supabase.from('factions').select('*').eq('campaign_id', campaign.id).order('created_at'),
    supabase.from('territories').select('*').eq('campaign_id', campaign.id).order('depth').order('created_at'),
    supabase.from('territory_influence').select('*').eq('campaign_id', campaign.id),
    supabase.from('warp_routes').select('*').eq('campaign_id', campaign.id),
    supabase.from('battles')
      .select('attacker_player_id, defender_player_id, attacker_faction_id, defender_faction_id, winner_faction_id')
      .eq('campaign_id', campaign.id),
    supabase.from('campaign_events').select('*')
      .eq('campaign_id', campaign.id).in('status', ['active', 'upcoming'])
      .order('created_at', { ascending: false }).limit(6),
    supabase.from('battles')
      .select('id, attacker_faction_id, defender_faction_id, winner_faction_id, created_at')
      .eq('campaign_id', campaign.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('campaign_events')
      .select('id, title, status, created_at')
      .eq('campaign_id', campaign.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('achievements').select('*')
      .eq('campaign_id', campaign.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('campaign_members')
      .select('*', { count: 'exact', head: true }).eq('campaign_id', campaign.id),
    supabase.from('battles')
      .select('*', { count: 'exact', head: true }).eq('campaign_id', campaign.id),
    supabase.from('campaign_events')
      .select('*', { count: 'exact', head: true }).eq('campaign_id', campaign.id).eq('status', 'active'),
  ]);

  // ── Player standings (top 6 by XP) ──────────────────────────────────────────
  const { data: allMembers } = await supabase
    .from('campaign_members').select('user_id, faction_id').eq('campaign_id', campaign.id);

  const allMemberIds = (allMembers || []).map(m => m.user_id);
  const { data: allProfiles } = allMemberIds.length > 0
    ? await supabase.from('profiles').select('id, username').in('id', allMemberIds)
    : { data: [] };

  const factionMap  = Object.fromEntries((factions   || []).map(f => [f.id, f]));
  const profileMap  = Object.fromEntries((allProfiles || []).map(p => [p.id, p]));

  const playerStandings = (allMembers || [])
    .map(m => ({
      userId:   m.user_id,
      username: profileMap[m.user_id]?.username ?? 'Unknown',
      colour:   factionMap[m.faction_id]?.colour ?? 'var(--border-dim)',
      xp:       calcPlayerXP(allBattles, m.user_id),
    }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 6);

  // ── Achievement profile map (for chronicle) ──────────────────────────────────
  const achievementPlayerIds = [...new Set(
    (recentAchievements || [])
      .filter(a => a.awarded_to_type === 'player' && a.awarded_to_player_id)
      .map(a => a.awarded_to_player_id)
  )];
  const { data: achievementProfiles } = achievementPlayerIds.length > 0
    ? await supabase.from('profiles').select('id, username').in('id', achievementPlayerIds)
    : { data: [] };
  const achievementProfileMap = Object.fromEntries(
    (achievementProfiles || []).map(p => [p.id, p])
  );

  // ── Chronicle ────────────────────────────────────────────────────────────────
  const chronicleEntries = [
    ...(recentBattles      || []).map(b => ({ type: 'battle',      created_at: b.created_at, data: b })),
    ...(recentEvents       || []).map(e => ({ type: 'event',       created_at: e.created_at, data: e })),
    ...(recentAchievements || []).map(a => ({ type: 'achievement', created_at: a.created_at, data: a })),
  ]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  // ── Membership / join request status ────────────────────────────────────────
  let isMember = false;
  let existingRequest = null;

  if (user) {
    const { data: membership } = await supabase
      .from('campaign_members').select('user_id')
      .eq('campaign_id', campaign.id).eq('user_id', user.id)
      .limit(1);
    isMember = !!(membership?.[0]);

    if (!isMember) {
      const { data: reqData } = await supabase
        .from('join_requests').select('status')
        .eq('campaign_id', campaign.id).eq('user_id', user.id)
        .limit(1);
      existingRequest = reqData?.[0] ?? null;
    }
  }

  // ── Current act label (stats bar) ───────────────────────────────────────────
  const { data: currentBulletinRows } = await supabase
    .from('bulletin_dispatches').select('act_label')
    .eq('campaign_id', campaign.id).eq('is_current', true)
    .limit(1);
  const currentBulletin = currentBulletinRows?.[0] ?? null;

  const topLevelTerritoryCount = (territories || []).filter(t => !t.parent_id).length;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)' }}>

      {/* ── Public banner ───────────────────────────────────────────────────── */}
      <div style={{
        background:    'rgba(183,140,64,0.05)',
        borderBottom:  '1px solid rgba(183,140,64,0.15)',
        padding:       '0.45rem 2rem',
        display:       'flex',
        alignItems:    'center',
        justifyContent:'space-between',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: '0.5rem',
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--text-gold)', opacity: 0.6,
        }}>
          ◆ Public Campaign Page
        </span>
        {isMember && (
          <Link href={`/c/${slug}`} style={{
            fontFamily: 'var(--font-display)', fontSize: '0.5rem',
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--text-gold)', textDecoration: 'none',
          }}>
            Go to Campaign Dashboard →
          </Link>
        )}
      </div>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div style={{ padding: '3rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>

        {/* ── Campaign header ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: '2rem' }}>
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: '0.65rem',
            letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'var(--text-gold)', marginBottom: '0.75rem',
          }}>
            {SETTING_LABELS[campaign.setting] || campaign.setting}
          </p>
          <div style={{
            display: 'flex', alignItems: 'flex-start',
            justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
          }}>
            <h1 style={{
              fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: '900',
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              {campaign.name}
            </h1>
            {/* Request Access CTA — top-right of header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
              <PublicAccessCTA
                userId={user?.id ?? null}
                isMember={isMember}
                campaignId={campaign.id}
                campaignSlug={slug}
                campaignName={campaign.name}
                existingRequest={existingRequest}
              />
            </div>
          </div>
          {campaign.description && (
            <p style={{
              color: 'var(--text-secondary)', fontStyle: 'italic',
              marginTop: '0.75rem', maxWidth: '600px', lineHeight: 1.6,
            }}>
              {campaign.description}
            </p>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════
            HERO ROW — Bulletin (left) + Map (right)
            ════════════════════════════════════════════════════════ */}
        <div className="hero-row">

          {/* Bulletin Panel — shows dispatch if public RLS is enabled */}
          <BulletinPanel
            campaignId={campaign.id}
            campaignSlug={slug}
            isOrganiser={false}
            factions={factions || []}
            territories={territories || []}
          />

          <div className="hero-map-wrap">
            {territories && territories.length > 0 ? (
              <CampaignMap
                territories={territories}
                factions={factions || []}
                influenceData={influenceData || []}
                warpRoutes={warpRoutes || []}
                campaignSlug={slug}
                setting={campaign.setting}
                readOnly={true}
              />
            ) : (
              <div style={{
                height: '100%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'var(--text-muted)',
                fontStyle: 'italic', fontSize: '0.9rem',
              }}>
                No territories mapped yet.
              </div>
            )}
            <Link
              href={`/c/${slug}/map`}
              style={{
                position: 'absolute', bottom: '1rem', right: '1rem',
                background: 'rgba(8,8,12,0.82)',
                border: '1px solid rgba(183,140,64,0.3)',
                padding: '0.35rem 0.85rem',
                fontFamily: 'var(--font-display)', fontSize: '0.52rem',
                letterSpacing: '0.14em', textTransform: 'uppercase',
                color: 'var(--text-gold)', textDecoration: 'none',
                backdropFilter: 'blur(4px)',
              }}
            >
              Full Map →
            </Link>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════
            EVENTS STRIP
            ════════════════════════════════════════════════════════ */}
        {activeEvents && activeEvents.length > 0 && (
          <div className="events-strip">
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'baseline', padding: '1rem 1.5rem 0.75rem',
            }}>
              <h2 className="strip-label">Active Events</h2>
            </div>
            <div className="events-grid">
              {activeEvents.map(ev => {
                const isActive      = ev.status === 'active';
                const statusColour  = isActive ? '#4caf75' : STATUS_COLOURS.upcoming;
                const endWeek       = ev.end_week ?? ev.week_end ?? null;
                return (
                  <div key={ev.id} className="event-card">
                    <div className="event-card-status">
                      <span className="event-dot" style={{ background: statusColour }} />
                      <span style={{ color: statusColour }}>{isActive ? 'Active' : 'Upcoming'}</span>
                    </div>
                    <p className="event-card-title">{ev.title}</p>
                    {ev.body && <EventCardBody body={ev.body} />}
                    <div className="event-card-meta">
                      {endWeek && <span>Ends Week {endWeek}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            STATS BAR
            ════════════════════════════════════════════════════════ */}
        <div className="stats-bar">
          {[
            { label: 'Factions',      value: factions?.length ?? 0,    href: null },
            { label: 'Players',       value: memberCount ?? 0,          href: null },
            { label: 'Battles',       value: battleCount ?? 0,          href: null },
            { label: 'Territories',   value: topLevelTerritoryCount,    href: null },
            { label: 'Active Events', value: activeEventCount ?? 0,     href: null },
            ...(currentBulletin?.act_label
              ? [{ label: 'Current Act', value: currentBulletin.act_label, href: null }]
              : []),
          ].map((stat, i, arr) => (
            <div key={stat.label} className="stat-cell" style={{
              flex: 1,
              borderRight: i < arr.length - 1 ? '1px solid var(--border-dim)' : 'none',
            }}>
              <div className="stat-value" style={
                stat.label === 'Current Act'
                  ? { fontSize: '0.75rem', letterSpacing: '0.05em' }
                  : {}
              }>
                {stat.value}
              </div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════
            BOTTOM ROW — Faction Standings | Player Standings | Chronicle
            ════════════════════════════════════════════════════════ */}
        <div className="bottom-row">

          {/* ── Faction Standings ──────────────────────────────────────────── */}
          <div className="standings-col">
            <div className="standings-col-header">
              <h2 className="standings-col-title">Faction Standings</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {factions && factions.length > 0
                ? [...factions]
                    .map(f => ({ ...f, wins: (allBattles || []).filter(b => b.winner_faction_id === f.id).length }))
                    .sort((a, b) => b.wins - a.wins)
                    .map((f, i) => (
                      <Link key={f.id} href={`/c/${slug}/faction/${f.id}`} style={{ textDecoration: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.2rem 0' }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.48rem', color: 'var(--text-muted)', width: '12px', textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                          <div style={{ width: '8px', height: '8px', background: f.colour, flexShrink: 0 }} />
                          <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem', flex: 1 }}>{f.name}</span>
                          <span style={{ color: f.wins > 0 ? f.colour : 'var(--text-muted)', fontSize: '0.78rem', fontWeight: f.wins > 0 ? '700' : '400' }}>
                            {f.wins} VP
                          </span>
                        </div>
                      </Link>
                    ))
                : <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>No factions yet.</p>
              }
            </div>
          </div>

          {/* ── Player Standings ───────────────────────────────────────────── */}
          <div className="standings-col" style={{ borderLeft: '1px solid var(--border-dim)' }}>
            <div className="standings-col-header">
              <h2 className="standings-col-title">Player Standings</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {playerStandings.length > 0
                ? playerStandings.map((p, i) => (
                    <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.15rem 0' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.48rem', color: 'var(--text-muted)', width: '12px', textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                      <div style={{ width: '24px', height: '24px', background: 'var(--bg-raised)', border: `1px solid ${p.colour}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: p.colour, fontWeight: '700', flexShrink: 0 }}>
                        {p.username.slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.username}</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.44rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{getXPRank(p.xp)}</div>
                      </div>
                      <span style={{ fontSize: '0.82rem', fontWeight: '700', color: p.xp > 0 ? 'var(--text-gold)' : 'var(--text-muted)', flexShrink: 0 }}>
                        {p.xp}<span style={{ fontSize: '0.58rem', fontWeight: '400', marginLeft: '0.15rem', opacity: 0.7 }}>xp</span>
                      </span>
                    </div>
                  ))
                : <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>No battles recorded yet.</p>
              }
            </div>
          </div>

          {/* ── Latest Chronicle ───────────────────────────────────────────── */}
          <div className="standings-col" style={{ borderLeft: '1px solid var(--border-dim)' }}>
            <div className="standings-col-header">
              <h2 className="standings-col-title">Latest Chronicle</h2>
            </div>

            {chronicleEntries.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {chronicleEntries.map((entry, idx) => {
                  const isLast  = idx === chronicleEntries.length - 1;
                  const date    = new Date(entry.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                  const rowStyle = {
                    display: 'flex', alignItems: 'flex-start', gap: '0.65rem',
                    paddingBottom: isLast ? 0 : '0.75rem',
                    borderBottom:  isLast ? 'none' : '1px solid var(--border-dim)',
                  };

                  if (entry.type === 'battle') {
                    const b            = entry.data;
                    const attacker     = factions?.find(f => f.id === b.attacker_faction_id);
                    const defender     = factions?.find(f => f.id === b.defender_faction_id);
                    const winner       = factions?.find(f => f.id === b.winner_faction_id);
                    const isDraw       = !b.winner_faction_id;
                    const atkWon       = b.winner_faction_id === b.attacker_faction_id;
                    const resultLabel  = isDraw ? 'Draw' : atkWon ? `${attacker?.name ?? '?'} Victory` : `${defender?.name ?? '?'} Victory`;
                    const resultColour = isDraw ? 'var(--text-muted)' : (winner?.colour ?? 'var(--text-gold)');
                    return (
                      <Link key={`b-${b.id}`} href={`/c/${slug}/battle/${b.id}`} style={{ textDecoration: 'none' }}>
                        <div style={rowStyle}>
                          <div style={{ width: '5px', height: '5px', background: resultColour, transform: 'rotate(45deg)', flexShrink: 0, marginTop: '0.5rem' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {attacker?.name ?? '?'} <span style={{ color: 'var(--text-muted)' }}>vs</span> {defender?.name ?? '?'}
                            </div>
                            <div style={{ fontSize: '0.66rem', color: resultColour, fontFamily: 'var(--font-display)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '0.1rem' }}>
                              {resultLabel}
                            </div>
                          </div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>{date}</span>
                        </div>
                      </Link>
                    );
                  }

                  if (entry.type === 'event') {
                    const ev = entry.data;
                    const sc = STATUS_COLOURS[ev.status] ?? 'var(--text-muted)';
                    return (
                      <div key={`e-${ev.id}`} style={rowStyle}>
                        <div style={{ width: '5px', height: '5px', background: sc, borderRadius: '1px', flexShrink: 0, marginTop: '0.5rem' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</div>
                          <div style={{ fontSize: '0.66rem', color: sc, fontFamily: 'var(--font-display)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '0.1rem' }}>Event · {ev.status}</div>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>{date}</span>
                      </div>
                    );
                  }

                  if (entry.type === 'achievement') {
                    const a             = entry.data;
                    const recipientName = a.awarded_to_type === 'faction'
                      ? (factions?.find(f => f.id === a.awarded_to_faction_id)?.name ?? '?')
                      : (achievementProfileMap[a.awarded_to_player_id]?.username ?? '?');
                    return (
                      <div key={`a-${a.id}`} style={rowStyle}>
                        <span style={{ fontSize: '0.9rem', flexShrink: 0, lineHeight: 1, marginTop: '0.1rem' }}>{a.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-gold)', fontFamily: 'var(--font-display)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '0.1rem' }}>Awarded to {recipientName}</div>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>{date}</span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>Nothing in the chronicle yet.</p>
            )}
          </div>

        </div>{/* end bottom-row */}

      </div>{/* end main content */}
    </div>
  );
}
