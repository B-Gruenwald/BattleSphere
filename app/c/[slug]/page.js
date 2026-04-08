import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { calcPlayerXP, getXPRank } from '@/app/lib/xp';
import CampaignMap from '@/app/components/CampaignMap';

const STATUS_COLOURS = {
  upcoming: '#6a8fc7',
  active:   '#b78c40',
  resolved: '#5a5445',
};

export default async function CampaignDashboard({ params }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch campaign
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!campaign) notFound();

  // Fetch factions
  const { data: factions } = await supabase
    .from('factions')
    .select('*')
    .eq('campaign_id', campaign.id)
    .order('created_at');

  // Fetch member count
  const { count: memberCount } = await supabase
    .from('campaign_members')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaign.id);

  // Fetch territory count
  const { count: territoryCount } = await supabase
    .from('territories')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaign.id);

  // Fetch battle count for stats strip
  const { count: battleCount } = await supabase
    .from('battles')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaign.id);

  // Fetch territories, influence, and warp routes for the embedded map
  const { data: territories } = await supabase
    .from('territories')
    .select('*')
    .eq('campaign_id', campaign.id)
    .order('depth')
    .order('created_at');

  const { data: influenceData } = await supabase
    .from('territory_influence')
    .select('*')
    .eq('campaign_id', campaign.id);

  const { data: warpRoutes } = await supabase
    .from('warp_routes')
    .select('*')
    .eq('campaign_id', campaign.id);

  // Fetch all battles — used for faction win counts and player XP
  const { data: allBattles } = await supabase
    .from('battles')
    .select('attacker_player_id, defender_player_id, attacker_faction_id, defender_faction_id, winner_faction_id, territory_id')
    .eq('campaign_id', campaign.id);

  // ── Recent Chronicle panel data ────────────────────────────

  // Recent battles (for chronicle panel)
  const { data: recentBattles } = await supabase
    .from('battles')
    .select('id, attacker_faction_id, defender_faction_id, winner_faction_id, created_at')
    .eq('campaign_id', campaign.id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Recent events — all statuses (for chronicle panel)
  const { data: recentEvents } = await supabase
    .from('campaign_events')
    .select('id, title, status, created_at')
    .eq('campaign_id', campaign.id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Recent achievements (for chronicle panel)
  const { data: recentAchievements } = await supabase
    .from('achievements')
    .select('*')
    .eq('campaign_id', campaign.id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Profiles for player achievement recipients
  const achievementPlayerIds = [...new Set(
    (recentAchievements || [])
      .filter(a => a.awarded_to_type === 'player' && a.awarded_to_player_id)
      .map(a => a.awarded_to_player_id)
  )];
  const { data: achievementRecipientProfiles } = achievementPlayerIds.length > 0
    ? await supabase.from('profiles').select('id, username').in('id', achievementPlayerIds)
    : { data: [] };
  const achievementProfileMap = Object.fromEntries(
    (achievementRecipientProfiles || []).map(p => [p.id, p])
  );

  // Merge and take 5 newest chronicle entries
  const chronicleEntries = [
    ...(recentBattles     || []).map(b => ({ type: 'battle',      created_at: b.created_at, data: b })),
    ...(recentEvents      || []).map(e => ({ type: 'event',       created_at: e.created_at, data: e })),
    ...(recentAchievements|| []).map(a => ({ type: 'achievement', created_at: a.created_at, data: a })),
  ]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  // ── Active Events panel data ───────────────────────────────

  const { data: activeEvents } = await supabase
    .from('campaign_events')
    .select('*')
    .eq('campaign_id', campaign.id)
    .in('status', ['active', 'upcoming'])
    .order('created_at', { ascending: false })
    .limit(5);

  // ── Player XP Standings ────────────────────────────────────
  const { data: allMembers } = await supabase
    .from('campaign_members')
    .select('user_id, faction_id')
    .eq('campaign_id', campaign.id);

  const allMemberIds = (allMembers || []).map(m => m.user_id);
  const { data: allProfiles } = allMemberIds.length > 0
    ? await supabase.from('profiles').select('id, username').in('id', allMemberIds)
    : { data: [] };

  const profileMapForXP  = Object.fromEntries((allProfiles  || []).map(p => [p.id, p]));
  const factionMapForXP  = Object.fromEntries((factions     || []).map(f => [f.id, f]));

  const playerStandings = (allMembers || [])
    .map(m => ({
      userId:   m.user_id,
      username: profileMapForXP[m.user_id]?.username ?? 'Unknown',
      colour:   factionMapForXP[m.faction_id]?.colour ?? 'var(--border-dim)',
      xp:       calcPlayerXP(allBattles, m.user_id),
    }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 6);

  const isOrganiser = campaign.organiser_id === user.id;

  const SETTING_LABELS = {
    'Gothic Sci-Fi': 'Gothic Sci-Fi · Warhammer 40,000',
    'Space Opera': 'Space Opera',
    'High Fantasy': 'High Fantasy',
    'Historical': 'Historical',
    'Custom': 'Custom Setting',
  };

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>

      {/* Campaign header */}
      <div style={{ marginBottom: '3rem' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.75rem' }}>
          {SETTING_LABELS[campaign.setting] || campaign.setting}
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {campaign.name}
          </h1>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link href={`/campaign/${slug}`} target="_blank" style={{ textDecoration: 'none' }}>
              <button className="btn-secondary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.6rem' }}>
                Share Public Page ↗
              </button>
            </Link>
            {isOrganiser && (
              <Link href={`/c/${slug}/admin`}>
                <button className="btn-secondary" style={{ padding: '0.5rem 1.25rem' }}>Admin</button>
              </Link>
            )}
          </div>
        </div>
        {campaign.description && (
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '0.75rem', maxWidth: '600px', lineHeight: 1.6 }}>
            {campaign.description}
          </p>
        )}
      </div>

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', borderTop: '1px solid var(--border-dim)', borderBottom: '1px solid var(--border-dim)', marginBottom: '3rem' }}>
        {[
          { label: 'Factions',    value: factions?.length ?? 0,  href: `/c/${slug}/factions` },
          { label: 'Players',     value: memberCount ?? 0,        href: `/c/${slug}/players` },
          { label: 'Territories', value: territoryCount ?? 0,     href: `/c/${slug}/map` },
          { label: 'Battles',     value: battleCount ?? 0,        href: `/c/${slug}/battles` },
        ].map((stat, i, arr) => (
          <Link key={stat.label} href={stat.href} style={{ textDecoration: 'none' }}>
            <div style={{ padding: '1.5rem 1rem', textAlign: 'center', borderRight: i < arr.length - 1 ? '1px solid var(--border-dim)' : 'none', cursor: 'pointer' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{stat.value}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>{stat.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Campaign Map ─────────────────────────────────────────────────── */}
      {territories && territories.length > 0 && (
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>
              Campaign Map
            </h2>
            <Link href={`/c/${slug}/map`} style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textDecoration: 'none' }}>
              Full map →
            </Link>
          </div>
          <div style={{ height: '52vh', minHeight: '380px', maxHeight: '560px', border: '1px solid var(--border-dim)', overflow: 'hidden' }}>
            <CampaignMap
              territories={territories}
              factions={factions || []}
              influenceData={influenceData || []}
              warpRoutes={warpRoutes || []}
              campaignSlug={slug}
              setting={campaign.setting}
            />
          </div>
        </div>
      )}

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>

        {/* Factions */}
        <div style={{ border: '1px solid var(--border-dim)', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>
              Faction Standings
            </h2>
            <Link href={`/c/${slug}/factions`} style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textDecoration: 'none' }}>View all →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {factions && factions.length > 0 ? [...factions]
              .map(f => ({
                ...f,
                wins: (allBattles || []).filter(b => b.winner_faction_id === f.id).length,
              }))
              .sort((a, b) => b.wins - a.wins)
              .map(f => (
              <Link key={f.id} href={`/c/${slug}/faction/${f.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.25rem 0' }}>
                  <div style={{ width: '10px', height: '10px', background: f.colour, flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-primary)', fontSize: '0.95rem', flex: 1 }}>{f.name}</span>
                  <span style={{ color: f.wins > 0 ? f.colour : 'var(--text-muted)', fontSize: '0.8rem', fontWeight: f.wins > 0 ? '700' : '400' }}>
                    {f.wins} {f.wins === 1 ? 'win' : 'wins'}
                  </span>
                </div>
              </Link>
            )) : (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>No factions yet.</p>
            )}
          </div>
        </div>

        {/* Player XP Standings */}
        <div style={{ border: '1px solid var(--border-dim)', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>
              Player Standings
            </h2>
            <Link href={`/c/${slug}/players`} style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textDecoration: 'none' }}>View all →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {playerStandings.length > 0 ? playerStandings.map((p, i) => (
              <Link key={p.userId} href={`/c/${slug}/player/${p.userId}`} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.2rem 0' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.5rem', color: 'var(--text-muted)', width: '14px', textAlign: 'right', flexShrink: 0 }}>
                    {i + 1}
                  </span>
                  <div style={{ width: '26px', height: '26px', background: 'var(--surface-2)', border: `1px solid ${p.colour}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: p.colour, fontWeight: '700', flexShrink: 0 }}>
                    {p.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.username}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.45rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{getXPRank(p.xp)}</div>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: '700', color: p.xp > 0 ? 'var(--text-gold)' : 'var(--text-muted)', flexShrink: 0 }}>
                    {p.xp}<span style={{ fontSize: '0.6rem', fontWeight: '400', marginLeft: '0.15rem', opacity: 0.7 }}>xp</span>
                  </span>
                </div>
              </Link>
            )) : (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>No battles recorded yet.</p>
            )}
          </div>
        </div>

        {/* Recent Chronicle */}
        <div style={{ border: '1px solid var(--border-dim)', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
            <Link href={`/c/${slug}/chronicle`} style={{ textDecoration: 'none' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>
                Recent Chronicle
              </h2>
            </Link>
            <Link href={`/c/${slug}/chronicle`} style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textDecoration: 'none' }}>View all →</Link>
          </div>

          {chronicleEntries.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {chronicleEntries.map((entry, idx) => {
                const isLast = idx === chronicleEntries.length - 1;
                const date = new Date(entry.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                const rowStyle = {
                  display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer',
                  paddingBottom: isLast ? 0 : '0.85rem',
                  borderBottom: isLast ? 'none' : '1px solid var(--border-dim)',
                };

                if (entry.type === 'battle') {
                  const b = entry.data;
                  const attacker     = factions?.find(f => f.id === b.attacker_faction_id);
                  const defender     = factions?.find(f => f.id === b.defender_faction_id);
                  const winner       = factions?.find(f => f.id === b.winner_faction_id);
                  const isDraw       = !b.winner_faction_id;
                  const attackerWon  = b.winner_faction_id === b.attacker_faction_id;
                  const resultLabel  = isDraw ? 'Draw'
                    : attackerWon ? `${attacker?.name ?? '?'} Victory`
                    : `${defender?.name ?? '?'} Victory`;
                  const resultColour = isDraw ? 'var(--text-muted)' : (winner?.colour ?? 'var(--text-gold)');
                  return (
                    <Link key={`b-${b.id}`} href={`/c/${slug}/battle/${b.id}`} style={{ textDecoration: 'none' }}>
                      <div style={rowStyle}>
                        <div style={{ width: '6px', height: '6px', background: resultColour, transform: 'rotate(45deg)', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {attacker?.name ?? '?'} <span style={{ color: 'var(--text-muted)' }}>vs</span> {defender?.name ?? '?'}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: resultColour, fontFamily: 'var(--font-display)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '0.15rem' }}>
                            {resultLabel}
                          </div>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>{date} →</span>
                      </div>
                    </Link>
                  );
                }

                if (entry.type === 'event') {
                  const ev = entry.data;
                  const statusColour = STATUS_COLOURS[ev.status] ?? 'var(--text-muted)';
                  return (
                    <Link key={`e-${ev.id}`} href={`/c/${slug}/events/${ev.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ ...rowStyle, alignItems: 'flex-start' }}>
                        <div style={{ width: '6px', height: '6px', background: statusColour, borderRadius: '1px', flexShrink: 0, marginTop: '0.45rem' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {ev.title}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: statusColour, fontFamily: 'var(--font-display)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '0.15rem' }}>
                            Event · {ev.status}
                          </div>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>{date} →</span>
                      </div>
                    </Link>
                  );
                }

                if (entry.type === 'achievement') {
                  const a = entry.data;
                  const recipientName = a.awarded_to_type === 'faction'
                    ? (factions?.find(f => f.id === a.awarded_to_faction_id)?.name ?? '?')
                    : (achievementProfileMap[a.awarded_to_player_id]?.username ?? '?');
                  return (
                    <Link key={`a-${a.id}`} href={`/c/${slug}/achievements`} style={{ textDecoration: 'none' }}>
                      <div style={rowStyle}>
                        <span style={{ fontSize: '0.95rem', flexShrink: 0, lineHeight: 1 }}>{a.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {a.title}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-gold)', fontFamily: 'var(--font-display)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '0.15rem' }}>
                            Awarded to {recipientName}
                          </div>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>{date} →</span>
                      </div>
                    </Link>
                  );
                }

                return null;
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ width: '6px', height: '6px', background: 'var(--gold)', transform: 'rotate(45deg)', margin: '0 auto 1rem', opacity: 0.4 }} />
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>Nothing in the chronicle yet.</p>
            </div>
          )}
        </div>

        {/* Active Events */}
        <div style={{ border: '1px solid var(--border-dim)', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
            <Link href={`/c/${slug}/events`} style={{ textDecoration: 'none' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>
                Active Events
              </h2>
            </Link>
            {isOrganiser && (
              <Link href={`/c/${slug}/events/new`} style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textDecoration: 'none' }}>
                Post event →
              </Link>
            )}
            {!isOrganiser && (activeEvents?.length ?? 0) > 0 && (
              <Link href={`/c/${slug}/events`} style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textDecoration: 'none' }}>
                View all →
              </Link>
            )}
          </div>

          {activeEvents && activeEvents.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {activeEvents.map(ev => {
                const statusColour = STATUS_COLOURS[ev.status] ?? 'var(--text-muted)';
                const date = new Date(ev.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                return (
                  <Link key={ev.id} href={`/c/${slug}/events/${ev.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', paddingBottom: '0.85rem', borderBottom: '1px solid var(--border-dim)', cursor: 'pointer' }}>
                      <div style={{ width: '6px', height: '6px', background: statusColour, transform: 'rotate(45deg)', flexShrink: 0, marginTop: '0.45rem' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ev.title}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: statusColour, fontFamily: 'var(--font-display)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '0.15rem' }}>
                          {ev.status}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>{date} →</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ width: '6px', height: '6px', background: 'var(--gold)', transform: 'rotate(45deg)', margin: '0 auto 1rem', opacity: 0.4 }} />
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                No active events.
              </p>
              {isOrganiser && (
                <Link href={`/c/${slug}/events/new`}>
                  <button className="btn-secondary" style={{ marginTop: '1rem', fontSize: '0.58rem' }}>Post an Event</button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link href={`/c/${slug}/map`}>
          <button className="btn-primary">View Campaign Map</button>
        </Link>
        <Link href={`/c/${slug}/battle/new`}>
          <button className="btn-secondary">Log a Battle</button>
        </Link>
        <Link href={`/c/${slug}/battles`}>
          <button className="btn-secondary">Battle History</button>
        </Link>
        <Link href={`/c/${slug}/factions`}>
          <button className="btn-secondary">Browse Factions</button>
        </Link>
        <Link href={`/c/${slug}/players`}>
          <button className="btn-secondary">View Players</button>
        </Link>
        <Link href={`/c/${slug}/events`}>
          <button className="btn-secondary">Campaign Events</button>
        </Link>
        <Link href={`/c/${slug}/chronicle`}>
          <button className="btn-secondary">Chronicle</button>
        </Link>
        <Link href={`/c/${slug}/achievements`}>
          <button className="btn-secondary">Achievements</button>
        </Link>
      </div>
    </div>
  );
}
