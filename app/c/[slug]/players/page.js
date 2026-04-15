import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import PlayerAchievementIcons from '@/app/components/PlayerAchievementIcons';
import { calcPlayerXP, getXPRank } from '@/app/lib/xp';

export default async function PlayersPage({ params }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!campaign) notFound();

  // Fetch members with faction assignment
  const { data: members } = await supabase
    .from('campaign_members')
    .select('user_id, role, faction_id')
    .eq('campaign_id', campaign.id);

  // Fetch profiles
  const memberIds = (members || []).map(m => m.user_id);
  const { data: profiles } = memberIds.length > 0
    ? await supabase.from('profiles').select('id, username').in('id', memberIds)
    : { data: [] };

  // Fetch factions for name/colour lookup
  const { data: factions } = await supabase
    .from('factions')
    .select('*')
    .eq('campaign_id', campaign.id);

  // Fetch all battles for win counts + XP calculation
  const { data: battles } = await supabase
    .from('battles')
    .select('attacker_player_id, defender_player_id, winner_faction_id, attacker_faction_id, defender_faction_id, territory_id, event_xp_bonus')
    .eq('campaign_id', campaign.id);

  // Fetch player achievements for this campaign
  const { data: achievements } = await supabase
    .from('achievements')
    .select('*')
    .eq('campaign_id', campaign.id)
    .eq('awarded_to_type', 'player');

  const profileMap  = Object.fromEntries((profiles  || []).map(p => [p.id, p]));
  const factionMap  = Object.fromEntries((factions  || []).map(f => [f.id, f]));

  // Group achievements by recipient player id
  const achievementsByPlayer = {};
  for (const a of (achievements || [])) {
    if (!a.awarded_to_player_id) continue;
    if (!achievementsByPlayer[a.awarded_to_player_id]) {
      achievementsByPlayer[a.awarded_to_player_id] = [];
    }
    achievementsByPlayer[a.awarded_to_player_id].push(a);
  }

  function getPlayerStats(userId) {
    const fought = (battles || []).filter(
      b => b.attacker_player_id === userId || b.defender_player_id === userId
    );
    const wins = fought.filter(b => {
      const isAttacker = b.attacker_player_id === userId;
      const theirFaction = isAttacker ? b.attacker_faction_id : b.defender_faction_id;
      return b.winner_faction_id === theirFaction;
    }).length;
    const draws  = fought.filter(b => b.winner_faction_id === null).length;
    const losses = fought.length - wins - draws;
    return { played: fought.length, wins, draws, losses };
  }

  const players = (members || [])
    .map(m => ({
      ...m,
      profile:      profileMap[m.user_id],
      faction:      m.faction_id ? factionMap[m.faction_id] : null,
      stats:        getPlayerStats(m.user_id),
      isMe:         m.user_id === user.id,
      achievements: achievementsByPlayer[m.user_id] || [],
      xp:           calcPlayerXP(battles, m.user_id),
    }))
    .sort((a, b) => b.stats.wins - a.stats.wins || a.profile?.username?.localeCompare(b.profile?.username));

  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '860px', margin: '0 auto' }}>

      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2.5rem' }}>
        <Link href={`/c/${slug}`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>
          {campaign.name}
        </Link>
        <span style={{ color: 'var(--border-dim)', fontSize: '0.8rem' }}>›</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Players</span>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.5rem' }}>
          {campaign.name}
        </p>
        <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Players
        </h1>
      </div>

      <div style={{ borderTop: '1px solid var(--border-dim)', marginBottom: '2.5rem' }} />

      {/* Player cards */}
      <div className="table-scroll-wrap">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 80px 60px 60px 60px 60px', gap: '0.5rem', padding: '0.6rem 1.25rem', borderBottom: '1px solid var(--border-dim)' }}>
          {['Player', 'Faction', 'XP', 'W', 'D', 'L', 'Played'].map(h => (
            <span key={h} style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: h === 'Player' || h === 'Faction' ? 'left' : 'center' }}>
              {h}
            </span>
          ))}
        </div>

        {players.map(player => {
          const username      = player.profile?.username ?? 'Unknown';
          const initials      = username.slice(0, 2).toUpperCase();
          const factionColour = player.faction?.colour || 'var(--border-dim)';

          return (
            <Link key={player.user_id} href={`/c/${slug}/player/${player.user_id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 140px 80px 60px 60px 60px 60px',
                gap: '0.5rem',
                padding: '0.9rem 1.25rem',
                borderBottom: '1px solid var(--border-dim)',
                alignItems: 'center',
              }}>
                {/* Player */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '32px', height: '32px', flexShrink: 0,
                    background: 'var(--surface-2)',
                    border: `1px solid ${factionColour}60`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', fontWeight: '700', color: factionColour,
                  }}>
                    {initials}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: '600' }}>
                      {username}
                      {player.isMe && <span style={{ marginLeft: '0.5rem', fontFamily: 'var(--font-display)', fontSize: '0.5rem', letterSpacing: '0.1em', color: 'var(--text-gold)' }}>YOU</span>}
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                      {player.role}
                    </div>
                    {/* Achievement icons */}
                    <PlayerAchievementIcons
                      achievements={player.achievements}
                      achievementsHref={`/c/${slug}/achievements`}
                    />
                  </div>
                </div>

                {/* Faction */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {player.faction ? (
                    <>
                      <div style={{ width: '8px', height: '8px', background: factionColour, transform: 'rotate(45deg)', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {player.faction.name}
                      </span>
                    </>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Unassigned</span>
                  )}
                </div>

                {/* XP */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: '700', color: player.xp > 0 ? 'var(--text-gold)' : 'var(--text-muted)' }}>
                    {player.xp}<span style={{ fontSize: '0.6rem', fontWeight: '400', marginLeft: '0.15rem', opacity: 0.7 }}>xp</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.45rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    {getXPRank(player.xp)}
                  </div>
                </div>

                {/* Stats */}
                {[player.stats.wins, player.stats.draws, player.stats.losses, player.stats.played].map((val, j) => (
                  <span key={j} style={{
                    textAlign: 'center', fontSize: '0.95rem',
                    color: j === 0 && val > 0 ? factionColour
                      : j === 2 && val > 0 ? '#e05a5a'
                      : 'var(--text-secondary)',
                    fontWeight: j === 0 ? '700' : '400',
                  }}>
                    {val}
                  </span>
                ))}
              </div>
            </Link>
          );
        })}
      </div>
      </div>

      <div style={{ marginTop: '2.5rem' }}>
        <Link href={`/c/${slug}`}>
          <button className="btn-secondary">← Campaign Dashboard</button>
        </Link>
      </div>
    </div>
  );
}
