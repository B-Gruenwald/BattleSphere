import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { calcPlayerXP, getXPRank } from '@/app/lib/xp';
import ProfileActions from './ProfileActions';

export async function generateMetadata({ params }) {
  const { username } = await params;
  const admin = createAdminClient();
  const cleanUsername = username.replace(/#.*$/, '');
  const { data: rows } = await admin
    .from('profiles')
    .select('username, profile_visibility, profile_public')
    .or(`username.eq.${cleanUsername},username.eq.${username}`)
    .limit(1);
  const profile = rows?.[0] ?? null;
  if (!profile || profile.profile_visibility === 'allies') {
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

  const cleanUsername = username.replace(/#.*$/, '');

  // Fetch profile
  const { data: profileRows } = await admin
    .from('profiles')
    .select('*')
    .or(`username.eq.${cleanUsername},username.eq.${username}`)
    .limit(1);
  const profile = profileRows?.[0] ?? null;

  if (!profile) notFound();

  // Determine visibility (fall back to old profile_public column)
  const visibility = profile.profile_visibility || (profile.profile_public === false ? 'members' : 'public');

  // Get the currently logged-in user
  let viewerUserId = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    viewerUserId = user?.id ?? null;
  } catch (_) {}

  const isOwnProfile = viewerUserId === profile.id;

  // ── Visibility gate ──────────────────────────────────────────────────────
  if (visibility === 'members' && !viewerUserId) {
    return (
      <div style={{ padding: '4rem 2rem', maxWidth: '680px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ width: '10px', height: '10px', background: 'var(--gold)', transform: 'rotate(45deg)', margin: '0 auto 2rem', opacity: 0.3 }} />
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.75rem' }}>
          Commander Profile
        </p>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '1rem' }}>{profile.username}</h1>
        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
          This commander's profile is visible to registered BattleSphere members.{' '}
          <Link href="/login" style={{ color: 'var(--text-gold)' }}>Sign in</Link> to view it.
        </p>
      </div>
    );
  }

  if (visibility === 'allies' && !isOwnProfile) {
    // Check if viewer shares a campaign with this user
    let isAlly = false;
    if (viewerUserId) {
      const { data: viewerCampaigns } = await admin
        .from('campaign_members')
        .select('campaign_id')
        .eq('user_id', viewerUserId);
      const viewerIds = (viewerCampaigns || []).map(r => r.campaign_id);
      if (viewerIds.length > 0) {
        const { data: sharedRows } = await admin
          .from('campaign_members')
          .select('campaign_id')
          .eq('user_id', profile.id)
          .in('campaign_id', viewerIds)
          .limit(1);
        isAlly = (sharedRows || []).length > 0;
      }
    }

    if (!isAlly) {
      return (
        <div style={{ padding: '4rem 2rem', maxWidth: '680px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ width: '10px', height: '10px', background: 'var(--gold)', transform: 'rotate(45deg)', margin: '0 auto 2rem', opacity: 0.3 }} />
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.75rem' }}>
            Commander Profile
          </p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '1rem' }}>{profile.username}</h1>
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
            This commander only shares their profile with allies — players who share a campaign with them.
          </p>
        </div>
      );
    }
  }

  const userId = profile.id;

  // ── Data fetching ─────────────────────────────────────────────────────────
  const [
    { data: armies },
    { data: membershipRows },
    { data: allBattles },
    { data: achievements },
  ] = await Promise.all([
    admin.from('armies').select('*').eq('player_id', userId).eq('is_public', true).order('created_at', { ascending: false }),
    admin.from('campaign_members').select('campaign_id, role, faction_id').eq('user_id', userId),
    admin.from('battles')
      .select('id, campaign_id, attacker_player_id, defender_player_id, attacker_faction_id, defender_faction_id, winner_faction_id, attacker_score, defender_score, territory_id, event_xp_bonus, headline, created_at')
      .or(`attacker_player_id.eq.${userId},defender_player_id.eq.${userId}`)
      .order('created_at', { ascending: false }),
    admin.from('achievements')
      .select('id, title, description, campaign_id, created_at')
      .eq('awarded_to_type', 'player')
      .eq('awarded_to_player_id', userId)
      .order('created_at', { ascending: false }),
  ]);

  const campaignIds = (membershipRows || []).map(m => m.campaign_id).filter(Boolean);
  const { data: campaignRows } = campaignIds.length > 0
    ? await admin.from('campaigns').select('id, name, slug, visibility, campaign_format, setting').in('id', campaignIds)
    : { data: [] };

  const roleByCampaign = Object.fromEntries((membershipRows || []).map(m => [m.campaign_id, m.role]));
  const campaignMap    = {};
  for (const c of (campaignRows || [])) {
    campaignMap[c.id] = { ...c, role: roleByCampaign[c.id] ?? 'player' };
  }
  const campaigns = Object.values(campaignMap).sort((a, b) => a.name.localeCompare(b.name));
  const battles   = allBattles || [];

  const { data: factions } = campaignIds.length > 0
    ? await admin.from('factions').select('id, name, colour, campaign_id').in('campaign_id', campaignIds)
    : { data: [] };
  const factionMap = Object.fromEntries((factions || []).map(f => [f.id, f]));

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalXP = calcPlayerXP(battles, userId);
  const rank    = getXPRank(totalXP);

  let wins = 0, draws = 0, losses = 0;
  for (const b of battles) {
    const isAttacker = b.attacker_player_id === userId;
    const myFaction  = isAttacker ? b.attacker_faction_id : b.defender_faction_id;
    if (!b.winner_faction_id) draws++;
    else if (b.winner_faction_id === myFaction) wins++;
    else losses++;
  }

  const memberSince   = new Date(profile.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const recentBattles = battles.slice(0, 8);

  // ── Profile extras ────────────────────────────────────────────────────────
  const bio         = profile.bio || null;
  const discord     = profile.discord_handle || null;
  const gameSystems = profile.game_systems || [];
  const hobbyTags   = profile.hobby_tags   || [];
  const socialLinks = profile.social_links || {};
  const bannerUrl   = profile.banner_image_url || null;
  const profileUrl  = `https://www.battlesphere.cc/players/${encodeURIComponent(cleanUsername)}`;

  // ── Design tokens ─────────────────────────────────────────────────────────
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
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>

      {/* ── Banner ── */}
      {bannerUrl && (
        <div style={{ width: '100%', height: '200px', overflow: 'hidden' }}>
          <img
            src={bannerUrl}
            alt="Profile banner"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}

      <div style={{ padding: '3rem 1.5rem' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '1.5rem' }}>
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

            {/* Edit + Share buttons — client component */}
            <ProfileActions isOwnProfile={isOwnProfile} profileUrl={profileUrl} />
          </div>
        </div>

        {/* ── Bio ── */}
        {bio && (
          <div style={{ marginBottom: '2rem', padding: '1rem 1.25rem', borderLeft: `3px solid ${GOLD}`, background: 'rgba(183,140,64,0.04)' }}>
            <p style={{ color: SEC, fontSize: '0.92rem', lineHeight: 1.75, whiteSpace: 'pre-wrap', margin: 0 }}>{bio}</p>
          </div>
        )}

        {/* ── Contact / Links row ── */}
        {(discord || socialLinks.instagram || socialLinks.website) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2rem' }}>
            {discord && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.8rem', border: `1px solid ${DIM}`, fontSize: '0.84rem', color: '#7289da' }}>
                {/* Discord icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#7289da" aria-hidden="true"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.001.022.015.043.032.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                {discord}
              </span>
            )}
            {socialLinks.instagram && (
              <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.8rem', border: `1px solid ${DIM}`, fontSize: '0.84rem', color: SEC, textDecoration: 'none' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
                Instagram
              </a>
            )}
            {socialLinks.website && (
              <a href={socialLinks.website} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.8rem', border: `1px solid ${DIM}`, fontSize: '0.84rem', color: SEC, textDecoration: 'none' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                Website
              </a>
            )}
          </div>
        )}

        {/* ── Hobby tags + Game systems ── */}
        {(hobbyTags.length > 0 || gameSystems.length > 0) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2.5rem' }}>
            {hobbyTags.map(tag => (
              <span key={tag} style={{ padding: '0.3rem 0.75rem', border: `1px solid ${GOLD}`, fontSize: '0.78rem', color: GOLD, background: 'rgba(183,140,64,0.07)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em' }}>
                {tag}
              </span>
            ))}
            {gameSystems.map(sys => (
              <span key={sys} style={{ padding: '0.3rem 0.75rem', border: `1px solid ${DIM}`, fontSize: '0.78rem', color: SEC }}>
                {sys}
              </span>
            ))}
          </div>
        )}

        {/* ── Stats row ── */}
        <div style={{ display: 'flex', gap: '1px', background: DIM, marginBottom: '2.5rem', border: `1px solid ${DIM}` }}>
          {[
            { val: wins,                label: 'Victories' },
            { val: draws,               label: 'Draws'     },
            { val: losses,              label: 'Defeats'   },
            { val: armies?.length ?? 0, label: 'Armies'    },
            { val: campaigns.length,    label: 'Campaigns' },
          ].map(({ val, label }) => (
            <div key={label} style={statBoxStyle}>
              <div style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1 }}>{val}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: MUTED, marginTop: '0.3rem' }}>{label}</div>
            </div>
          ))}
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
                  <div style={{ border: `1px solid ${DIM}`, overflow: 'hidden' }}>
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

                const isDraw       = !b.winner_faction_id;
                const iWon         = !isDraw && b.winner_faction_id === myFactionId;
                const result       = isDraw ? 'Draw' : iWon ? 'Victory' : 'Defeat';
                const resultColour = isDraw ? MUTED : iWon ? (myFaction?.colour || GOLD) : '#e05a5a';
                const date         = new Date(b.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

                return (
                  <Link key={b.id} href={`/c/${campaign?.slug}/battle/${b.id}`} style={{ textDecoration: 'none', display: 'block' }}>
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
                <div key={a.id} title={a.description || ''} style={{ border: `1px solid ${DIM}`, padding: '0.4rem 0.85rem', fontSize: '0.82rem', color: SEC, background: 'rgba(183,140,64,0.06)' }}>
                  {a.title}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Empty state ── */}
        {(!armies || armies.length === 0) && campaigns.length === 0 && battles.length === 0 && (!achievements || achievements.length === 0) && !bio && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', border: `1px solid ${DIM}` }}>
            <div style={{ width: '8px', height: '8px', background: GOLD, transform: 'rotate(45deg)', margin: '0 auto 1.5rem', opacity: 0.3 }} />
            <p style={{ color: MUTED, fontStyle: 'italic' }}>This commander's record is yet to be written.</p>
          </div>
        )}

      </div>
    </div>
  );
}
