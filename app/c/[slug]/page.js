import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

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

  // Fetch recent battles (last 5)
  const { data: recentBattles } = await supabase
    .from('battles')
    .select('id, attacker_faction_id, defender_faction_id, winner_faction_id, attacker_score, defender_score, territory_id, created_at')
    .eq('campaign_id', campaign.id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Fetch battle count for stats strip
  const { count: battleCount } = await supabase
    .from('battles')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaign.id);

  // Fetch all battles for faction win counts
  const { data: allBattles } = await supabase
    .from('battles')
    .select('attacker_faction_id, defender_faction_id, winner_faction_id')
    .eq('campaign_id', campaign.id);

  // Fetch active + upcoming events (max 5 shown on dashboard)
  const { data: activeEvents } = await supabase
    .from('campaign_events')
    .select('*')
    .eq('campaign_id', campaign.id)
    .in('status', ['active', 'upcoming'])
    .order('created_at', { ascending: false })
    .limit(5);

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
          {isOrganiser && (
            <Link href={`/c/${slug}/admin`}>
              <button className="btn-secondary" style={{ padding: '0.5rem 1.25rem' }}>Admin</button>
            </Link>
          )}
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

        {/* Recent battles */}
        <div style={{ border: '1px solid var(--border-dim)', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
            <Link href={`/c/${slug}/battles`} style={{ textDecoration: 'none' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>
                Recent Battles
              </h2>
            </Link>
            <Link href={`/c/${slug}/battle/new`} style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textDecoration: 'none' }}>Log battle →</Link>
          </div>
          {recentBattles && recentBattles.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {recentBattles.map(battle => {
                const attacker = factions?.find(f => f.id === battle.attacker_faction_id);
                const defender = factions?.find(f => f.id === battle.defender_faction_id);
                const winner   = factions?.find(f => f.id === battle.winner_faction_id);
                const resultLabel = !battle.winner_faction_id ? 'Draw'
                  : battle.winner_faction_id === battle.attacker_faction_id ? `${attacker?.name ?? '?'} Victory`
                  : `${defender?.name ?? '?'} Victory`;
                const resultColour = !battle.winner_faction_id ? 'var(--text-muted)'
                  : winner?.colour ?? 'var(--text-gold)';
                const date = new Date(battle.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                return (
                  <Link key={battle.id} href={`/c/${slug}/battle/${battle.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBottom: '0.85rem', borderBottom: '1px solid var(--border-dim)', cursor: 'pointer' }}>
                      <div style={{ width: '6px', height: '6px', background: resultColour, transform: 'rotate(45deg)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {attacker?.name ?? '?'} <span style={{ color: 'var(--text-muted)' }}>vs</span> {defender?.name ?? '?'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: resultColour, fontFamily: 'var(--font-display)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '0.15rem' }}>
                          {resultLabel}
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
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>No battles recorded yet.</p>
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
      </div>
    </div>
  );
}
