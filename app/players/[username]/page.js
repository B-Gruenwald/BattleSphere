import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { calcPlayerXP, getXPRank } from '@/app/lib/xp';

export async function generateMetadata({ params }) {
  const { username } = await params;
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from('profiles')
    .select('username, profile_public')
    .eq('username', username)
    .limit(1);
  const profile = rows?.[0] ?? null;
  if (!profile || !profile.profile_public) {
    return { title: 'Player Profile · BattleSphere' };
  }
  return {
    title: `${profile.username} · BattleSphere`,
    description: `View ${profile.username}'s armies, campaigns, and battle record on BattleSphere.`,
  };
}

export default async function PublicPlayerProfilePage({ params }) {
  const { username } = await params;
  const admin = createAdminClient();

  // Fetch profile by username
  const { data: profileRows } = await admin
    .from('profiles')
    .select('*')
    .eq('username', username)
    .limit(1);
  const profile = profileRows?.[0] ?? null;

  if (!profile) notFound();

  // Private profile — show a tasteful placeholder
  if (profile.profile_public === false) {
    return (
      <div style={{ padding: '4rem 2rem', maxWidth: '680px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ width: '10px', height: '10px', background: 'var(--gold)', transform: 'rotate(45deg)', margin: '0 auto 2rem', opacity: 0.3 }} />
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.75rem' }}>
          Commander Profile
        </p>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '1rem' }}>{profile.username}</h1>
        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>This commander keeps their record private.</p>
      </div>
    );
  }

  const userId = profile.id;

  // Fetch all data in parallel
  const [
    { data: armies },
    { data: memberships },
    { data: allBattles },
    { data: achievements },
  ] = await Promise.all([
    // Public armies only
    admin.from('armies').select('*').eq('player_id', userId).eq('is_public', true).order('created_at', { ascending: false }),

    // Campaign memberships (with campaign info)
    admin.from('campaign_members')
      .select('role, faction_id, campaigns(id, name, slug, visibility, campaign_format, setting)')
      .eq('user_id', userId),

    // All battles where this player participated (we filter by public campaign below)
    admin.from('battles')
      .select('id, campaign_id, attacker_player_id, defender_player_id, attacker_faction_id, defender_faction_id, winner_faction_id, attacker_score, defender_score, territory_id, event_xp_bonus, headline, created_at')
      .or(`attacker_player_id.eq.${userId},defender_player_id.eq.${userId}`)
      .order('created_at', { ascending: false }),

    // All achievements across all campaigns
    admin.from('achievements')
      .select('id, title, description, campaign_id, created_at')
      .eq('awarded_to_type', 'player')
      .eq('awarded_to_player_id', userId)
      .order('created_at', { ascending: false }),
  ]);

  // Build campaign map
  const campaignMap = {};
  const publicCampaignIds = new Set();
  for (const m of (memberships || [])) {
    const c = m.campaigns;
    if (!c) continue;
    campaignMap[c.id] = { ...c, role: m.role, faction_id: m.faction_id };
    if (c.visibility === 'Public') publicCampaignIds.add(c.id);
  }

  const campaigns = Object.values(campaignMap);

  // Filter battles to public campaigns only
  const publicBattles = (allBattles || []).filter(b => publicCampaignIds.has(b.campaign_id));

  // Compute XP from ALL battles (not restricted)
  const totalXP = calcPlayerXP(allBattles || [], userId);
  const rank = getXPRank(totalXP);

  // Compute overall W/D/L from public battles
  let wins = 0, draws = 0, losses = 0;
  for (const b of publicBattles) {
    const isAttacker = b.attacker_player_id === userId;
    const myFaction = isAttacker ? b.attacker_faction_id : b.defender_faction_id;
    if (!b.winner_faction_id) draws++;
    else if (b.winner_faction_id === myFaction) wins++;
    else losses++;
  }

  // Fetch factions for public campaigns (for battle display colour)
  const publicCampaignIdArr = [...publicCampaignIds];
  const { data: factions } = publicCampaignIdArr.length > 0
    ? await admin.from('factions').select('id, name, colour, campaign_id').in('campaign_id', publicCampaignIdArr)
    : { data: [] };
  const factionMap = Object.fromEntries((factions || []).map(f => [f.id, f]));

  const memberSince = new Date(profile.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const recentBattles = publicBattles.slice(0, 8);

  const GOLD  = 'var(--gold)';
  const MUTED = 'var(--text-muted)';
  const SEC   = 'var(--text-secondary)';
  const DIM   = 'var(--border-dim)';

  const statBoxStyle = {
    border: `1px solid ${DIM}`,
    padding: '1rem',
    textAlign: 'center',
    flex: 1,
  };

  return (
    <div style={{ padding: '3rem 1.5rem', maxWidth: '860px', margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD, marginBottom: '0.5rem' }}>
          Commander Profile
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 2.2rem)', fontWeight: '900', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              {profile.username}
            </h1>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.62rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD }}>
                {rank} · {totalXP} XP
              </span>
              <span style={{ color: MUTED, fontSize: '0.8rem' }}>Member since {memberSince}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div style={{ display: 'flex', gap: '1px', background: DIM, marginBottom: '2.5rem', border: `1px solid ${DIM}` }}>
        <div style={statBoxStyle}>
          <div style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1 }}>{wins}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD, marginTop: '0.3rem' }}>Victories</div>
        </div>
        <div style={statBoxStyle}>
          <div style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1 }}>{draws}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: MUTED, marginTop: '0.3rem' }}>Draws</div>
        </div>
        <div style={statBoxStyle}>
          <div style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1 }}>{losses}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: SEC, marginTop: '0.3rem' }}>Defeats</div>
        </div>
        <div style={statBoxStyle}>
          <div style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1 }}>{armies?.length ?? 0}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: MUTED, marginTop: '0.3rem' }}>Armies</div>
        </div>
        <div style={statBoxStyle}>
          <div style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1 }}>{campaigns.length}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: MUTED, marginTop: '0.3rem' }}>Campaigns</div>
        </div>
      </div>

      {/* ── Armies ── */}
      {armies && armies.length > 0 && (
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD, marginBottom: '1rem' }}>
            Army Portfolios
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {armies.map(army => (
              <Link key={army.id} href={`/armies/${army.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ border: `1px solid ${DIM}`, overflow: 'hidden', transition: 'border-color 0.15s' }}>
                  {army.cover_image_url ? (
                    <div style={{ height: '90px', overflow: 'hidden' }}>
                      <img
                        src={army.cover_image_url}
                        alt={army.name}
                        style={{
                          width: '100%', height: '100%', objectFit: 'cover',
                          objectPosition: army.cover_focal_point === 'top' ? 'center top'
                            : army.cover_focal_point === 'bottom' ? 'center bottom'
                            : 'center',
                        }}
                      />
                    </div>
                  ) : (
                    <div style={{ height: '90px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: '14px', height: '14px', background: GOLD, transform: 'rotate(45deg)', opacity: 0.25 }} />
                    </div>
                  )}
                  <div style={{ padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {army.name}
                    </div>
                    {army.faction_name && (
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED }}>
                        {army.faction_name}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Campaigns ── */}
      {campaigns.length > 0 && (
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD, marginBottom: '1rem' }}>
            Campaigns
          </h2>
          <div style={{ border: `1px solid ${DIM}` }}>
            {campaigns.map((c, i) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1rem', borderBottom: i < campaigns.length - 1 ? `1px solid ${DIM}` : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {c.visibility === 'Public' ? (
                    <Link href={`/campaign/${c.slug}`} style={{ textDecoration: 'none', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '600' }}>
                      {c.name}
                    </Link>
                  ) : (
                    <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '600' }}>{c.name}</span>
                  )}
                  {c.setting && (
                    <div style={{ fontSize: '0.78rem', color: MUTED, fontStyle: 'italic', marginTop: '0.1rem' }}>{c.setting}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.52rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED, border: `1px solid ${DIM}`, padding: '2px 6px' }}>
                    {c.campaign_format === 'league' ? 'League' : 'Narrative'}
                  </span>
                  {['organiser', 'Organiser', 'admin'].includes(c.role) && (
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.52rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: GOLD, border: `1px solid ${GOLD}`, padding: '2px 6px' }}>
                      Organiser
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Recent Battles ── */}
      {recentBattles.length > 0 && (
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD, marginBottom: '1rem' }}>
            Recent Battles
          </h2>
          <div style={{ border: `1px solid ${DIM}` }}>
            {recentBattles.map((b, i) => {
              const campaign     = campaignMap[b.campaign_id];
              const isAttacker   = b.attacker_player_id === userId;
              const myFactionId  = isAttacker ? b.attacker_faction_id : b.defender_faction_id;
              const oppFactionId = isAttacker ? b.defender_faction_id : b.attacker_faction_id;
              const myFaction    = factionMap[myFactionId];
              const oppFaction   = factionMap[oppFactionId];

              const isDraw  = !b.winner_faction_id;
              const iWon    = !isDraw && b.winner_faction_id === myFactionId;
              const result  = isDraw ? 'Draw' : iWon ? 'Victory' : 'Defeat';
              const resultColour = isDraw ? MUTED : iWon ? (myFaction?.colour || GOLD) : '#e05a5a';
              const date    = new Date(b.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

              return (
                <Link
                  key={b.id}
                  href={`/c/${campaign?.slug}/battle/${b.id}`}
                  style={{ textDecoration: 'none', display: 'block' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', padding: '0.75rem 1rem', borderBottom: i < recentBattles.length - 1 ? `1px solid ${DIM}` : 'none' }}>
                    <div style={{ width: '7px', height: '7px', background: resultColour, transform: 'rotate(45deg)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '0.15rem' }}>
                        <span style={{ color: myFaction?.colour || SEC }}>{myFaction?.name ?? '?'}</span>
                        <span style={{ color: MUTED, margin: '0 0.4rem' }}>vs</span>
                        <span style={{ color: oppFaction?.colour || SEC }}>{oppFaction?.name ?? '?'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: resultColour }}>
                          {result}
                        </span>
                        {campaign && (
                          <span style={{ fontSize: '0.72rem', color: MUTED, fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {campaign.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: MUTED, flexShrink: 0 }}>{date}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Achievements ── */}
      {achievements && achievements.length > 0 && (
        <section>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD, marginBottom: '1rem' }}>
            Achievements
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            {achievements.map(a => (
              <div
                key={a.id}
                title={a.description || ''}
                style={{
                  border: `1px solid ${DIM}`,
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)',
                  background: 'rgba(183,140,64,0.06)',
                }}
              >
                {a.title}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {(!armies || armies.length === 0) && campaigns.length === 0 && recentBattles.length === 0 && (!achievements || achievements.length === 0) && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', border: `1px solid ${DIM}` }}>
          <div style={{ width: '8px', height: '8px', background: GOLD, transform: 'rotate(45deg)', margin: '0 auto 1.5rem', opacity: 0.3 }} />
          <p style={{ color: MUTED, fontStyle: 'italic' }}>This commander's record is yet to be written.</p>
        </div>
      )}
    </div>
  );
}
