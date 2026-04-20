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

  const isLeague = campaign.campaign_format === 'league';

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

  // Fetch factions / teams for name + colour lookup
  const { data: factions } = await supabase
    .from('factions')
    .select('*')
    .eq('campaign_id', campaign.id);

  // Fetch all battles for stats calculation
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
    if (!achievementsByPlayer[a.awarded_to_player_id]) achievementsByPlayer[a.awarded_to_player_id] = [];
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
    .map(m => {
      const stats = getPlayerStats(m.user_id);
      return {
        ...m,
        profile:      profileMap[m.user_id],
        faction:      m.faction_id ? factionMap[m.faction_id] : null,
        stats,
        points:       stats.wins * 3 + stats.draws,
        isMe:         m.user_id === user.id,
        achievements: achievementsByPlayer[m.user_id] || [],
        xp:           calcPlayerXP(battles, m.user_id),
      };
    })
    .sort(isLeague
      // League: points desc, then wins, then name
      ? (a, b) => b.points - a.points || b.stats.wins - a.stats.wins || (a.profile?.username ?? '').localeCompare(b.profile?.username ?? '')
      // Narrative: alphabetical
      : (a, b) => (a.profile?.username ?? '').localeCompare(b.profile?.username ?? '')
    );

  const teamLabel = isLeague ? 'Team' : 'Faction';

  // ── Shared header style ──
  const colHeaderStyle = {
    fontFamily: 'var(--font-display)', fontSize: '0.55rem',
    letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)',
  };

  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '900px', margin: '0 auto' }}>

      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2.5rem' }}>
        <Link href={`/c/${slug}`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>
          {campaign.name}
        </Link>
        <span style={{ color: 'var(--border-dim)', fontSize: '0.8rem' }}>›</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
          {isLeague ? 'League Table' : 'Players'}
        </span>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.5rem' }}>
          {campaign.name}
        </p>
        <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {isLeague ? 'League Table' : 'Players'}
        </h1>
        {isLeague && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic', marginTop: '0.5rem' }}>
            3 pts for a win · 1 pt for a draw · 0 pts for a loss
          </p>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--border-dim)', marginBottom: '2.5rem' }} />

      <div className="table-scroll-wrap">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

          {isLeague ? (
            /* ── LEAGUE TABLE ─────────────────────────────────── */
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 160px 56px 56px 56px 56px 72px', gap: '0.5rem', padding: '0.6rem 1.25rem', borderBottom: '1px solid var(--border-dim)' }}>
                {['#', 'Player', teamLabel, 'P', 'W', 'D', 'L', 'Pts'].map((h, i) => (
                  <span key={h} style={{ ...colHeaderStyle, textAlign: i >= 3 ? 'center' : 'left' }}>{h}</span>
                ))}
              </div>

              {players.map((player, idx) => {
                const username      = player.profile?.username ?? 'Unknown';
                const initials      = username.slice(0, 2).toUpperCase();
                const teamColour    = player.faction?.colour || 'var(--border-dim)';
                const isTop         = idx === 0 && player.points > 0;

                return (
                  <Link key={player.user_id} href={`/c/${slug}/player/${player.user_id}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '36px 1fr 160px 56px 56px 56px 56px 72px',
                      gap: '0.5rem',
                      padding: '0.9rem 1.25rem',
                      borderBottom: '1px solid var(--border-dim)',
                      alignItems: 'center',
                      background: isTop ? 'rgba(183,140,64,0.04)' : 'transparent',
                    }}>
                      {/* Rank */}
                      <div style={{
                        fontFamily: 'var(--font-display)', fontSize: '0.7rem',
                        color: isTop ? 'var(--text-gold)' : 'var(--text-muted)',
                        fontWeight: isTop ? '700' : '400',
                        textAlign: 'center',
                      }}>
                        {idx + 1}
                      </div>

                      {/* Player */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '32px', height: '32px', flexShrink: 0,
                          background: 'var(--surface-2)',
                          border: `1px solid ${teamColour}60`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.7rem', fontWeight: '700', color: teamColour,
                        }}>
                          {initials}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: '600' }}>
                            {username}
                            {player.isMe && <span style={{ marginLeft: '0.5rem', fontFamily: 'var(--font-display)', fontSize: '0.5rem', letterSpacing: '0.1em', color: 'var(--text-gold)' }}>YOU</span>}
                          </div>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                            {getXPRank(player.xp)}
                          </div>
                        </div>
                      </div>

                      {/* Team */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {player.faction ? (
                          <>
                            <div style={{ width: '8px', height: '8px', background: teamColour, transform: 'rotate(45deg)', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {player.faction.name}
                            </span>
                          </>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Unassigned</span>
                        )}
                      </div>

                      {/* P W D L */}
                      {[player.stats.played, player.stats.wins, player.stats.draws, player.stats.losses].map((val, j) => (
                        <span key={j} style={{
                          textAlign: 'center', fontSize: '0.95rem',
                          color: j === 1 && val > 0 ? teamColour
                            : j === 3 && val > 0 ? '#e05a5a'
                            : 'var(--text-secondary)',
                          fontWeight: j === 1 ? '700' : '400',
                        }}>
                          {val}
                        </span>
                      ))}

                      {/* Points */}
                      <div style={{ textAlign: 'center' }}>
                        <span style={{
                          fontSize: '1.05rem', fontWeight: '900',
                          color: player.points > 0 ? 'var(--text-gold)' : 'var(--text-muted)',
                        }}>
                          {player.points}
                        </span>
                        <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginLeft: '0.15rem' }}>pts</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </>
          ) : (
            /* ── NARRATIVE PLAYER LIST (existing view) ─────────── */
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 80px 60px 60px 60px 60px', gap: '0.5rem', padding: '0.6rem 1.25rem', borderBottom: '1px solid var(--border-dim)' }}>
                {['Player', 'Faction', 'XP', 'W', 'D', 'L', 'Played'].map(h => (
                  <span key={h} style={{ ...colHeaderStyle, textAlign: h === 'Player' || h === 'Faction' ? 'left' : 'center' }}>
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
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: '2.5rem' }}>
        <Link href={`/c/${slug}`}>
          <button className="btn-secondary">← {isLeague ? 'League' : 'Campaign'} Dashboard</button>
        </Link>
      </div>
    </div>
  );
}
