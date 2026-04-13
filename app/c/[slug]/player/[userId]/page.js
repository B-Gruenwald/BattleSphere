import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import SetFactionForm from '@/app/components/SetFactionForm';
import CampaignArmySection from '@/app/components/CampaignArmySection';
import { calcPlayerXP, getXPRank } from '@/app/lib/xp';

export default async function PlayerProfilePage({ params }) {
  const { slug, userId } = await params;
  const supabase = await createClient();
  const admin    = createAdminClient();

  // Public page — user may be null (unauthenticated visitor)
  const { data: { user } } = await supabase.auth.getUser();

  // Use admin client for all data so unauthenticated visitors can read
  const { data: campaign } = await admin
    .from('campaigns')
    .select('*')
    .eq('slug', slug)
    .limit(1)
    .then(r => ({ data: r.data?.[0] ?? null }));

  if (!campaign) notFound();

  // Fetch this player's membership
  const { data: memberRows } = await admin
    .from('campaign_members')
    .select('user_id, role, faction_id')
    .eq('campaign_id', campaign.id)
    .eq('user_id', userId)
    .limit(1);
  const membership = memberRows?.[0] ?? null;

  if (!membership) notFound();

  // Fetch profile
  const { data: profileRows } = await admin
    .from('profiles')
    .select('id, username')
    .eq('id', userId)
    .limit(1);
  const profile = profileRows?.[0] ?? null;

  // Fetch factions
  const { data: factions } = await admin
    .from('factions')
    .select('*')
    .eq('campaign_id', campaign.id)
    .order('created_at');

  // Fetch battles involving this player
  const { data: battles } = await admin
    .from('battles')
    .select('*')
    .eq('campaign_id', campaign.id)
    .or(`attacker_player_id.eq.${userId},defender_player_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  // Fetch achievements for this player
  const { data: achievements } = await admin
    .from('achievements')
    .select('*')
    .eq('campaign_id', campaign.id)
    .eq('awarded_to_type', 'player')
    .eq('awarded_to_player_id', userId)
    .order('created_at', { ascending: false });

  const factionMap = Object.fromEntries((factions || []).map(f => [f.id, f]));
  const assignedFaction = membership.faction_id ? factionMap[membership.faction_id] : null;
  const isOwnProfile = !!user && user.id === userId;

  // Check if the viewer is a campaign organiser (only if logged in)
  let isOrganiser = false;
  if (user) {
    isOrganiser = campaign.organiser_id === user.id;
    if (!isOrganiser) {
      const { data: myMemberRows } = await admin
        .from('campaign_members')
        .select('role')
        .eq('campaign_id', campaign.id)
        .eq('user_id', user.id)
        .limit(1);
      isOrganiser = ['organiser', 'admin'].includes(myMemberRows?.[0]?.role);
    }
  }

  // Compute record
  function calcResult(battle) {
    const isAttacker  = battle.attacker_player_id === userId;
    const myFaction   = isAttacker ? battle.attacker_faction_id : battle.defender_faction_id;
    if (!battle.winner_faction_id) return 'draw';
    return battle.winner_faction_id === myFaction ? 'win' : 'loss';
  }

  const wins   = (battles || []).filter(b => calcResult(b) === 'win').length;
  const draws  = (battles || []).filter(b => calcResult(b) === 'draw').length;
  const losses = (battles || []).filter(b => calcResult(b) === 'loss').length;

  const xp     = calcPlayerXP(battles, userId);
  const rank   = getXPRank(xp);

  // Player's army portfolio (public armies only for other viewers; own armies always shown)
  const armyQuery = admin.from('armies').select('*').eq('player_id', userId).order('created_at', { ascending: false });
  const { data: playerArmies } = isOwnProfile
    ? await armyQuery
    : await armyQuery.eq('is_public', true);

  // Campaign army record for this player in this campaign
  const { data: carRows } = await admin
    .from('campaign_army_records')
    .select('*')
    .eq('campaign_id', campaign.id)
    .eq('player_id', userId)
    .limit(1);
  const campaignArmyRecord = carRows?.[0] ?? null;

  // Fetch the linked army details (if any)
  let campaignLinkedArmy = null;
  let campaignArmyUnits  = [];
  let crusadeUnitRecords  = [];
  if (campaignArmyRecord) {
    const { data: laRows } = await admin
      .from('armies')
      .select('*')
      .eq('id', campaignArmyRecord.army_id)
      .limit(1);
    campaignLinkedArmy = laRows?.[0] ?? null;

    // All units in this army (for the enlist dropdown)
    const { data: unitRows } = await admin
      .from('army_units')
      .select('*')
      .eq('army_id', campaignArmyRecord.army_id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    campaignArmyUnits = unitRows ?? [];

    // Crusade unit records for this campaign army
    const { data: curRows } = await admin
      .from('crusade_unit_records')
      .select('*')
      .eq('campaign_army_record_id', campaignArmyRecord.id)
      .order('created_at', { ascending: true });
    crusadeUnitRecords = curRows ?? [];
  }

  // Fetch opponent player profiles for battle display
  const opponentIds = [...new Set(
    (battles || []).flatMap(b => [b.attacker_player_id, b.defender_player_id])
      .filter(id => id && id !== userId)
  )];
  const { data: opponentProfiles } = opponentIds.length > 0
    ? await admin.from('profiles').select('id, username').in('id', opponentIds)
    : { data: [] };
  const opponentMap = Object.fromEntries((opponentProfiles || []).map(p => [p.id, p]));

  const username    = profile?.username ?? 'Unknown';
  const initials    = username.slice(0, 2).toUpperCase();
  const avatarColour = assignedFaction?.colour || 'var(--border-dim)';

  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '860px', margin: '0 auto' }}>

      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
        <Link href={`/c/${slug}`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>{campaign.name}</Link>
        <span style={{ color: 'var(--border-dim)', fontSize: '0.8rem' }}>›</span>
        <Link href={`/c/${slug}/players`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>Players</Link>
        <span style={{ color: 'var(--border-dim)', fontSize: '0.8rem' }}>›</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{username}</span>
      </nav>

      {/* Player header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
        <div style={{
          width: '64px', height: '64px', flexShrink: 0,
          background: 'var(--surface-2)',
          border: `2px solid ${avatarColour}60`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.3rem', fontWeight: '700', color: avatarColour,
        }}>
          {initials}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {username}
            </h1>
            {isOwnProfile && (
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.5rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-gold)', border: '1px solid var(--gold)', padding: '0.2rem 0.5rem' }}>
                You
              </span>
            )}
          </div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
            {membership.role} · {campaign.name}
          </p>
        </div>
      </div>

      {/* Record strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', borderTop: '1px solid var(--border-dim)', borderBottom: '1px solid var(--border-dim)', marginBottom: '2.5rem' }}>
        {[
          { label: 'Victories', value: wins,                   colour: wins > 0 ? avatarColour : 'var(--text-secondary)' },
          { label: 'Draws',     value: draws,                  colour: 'var(--text-secondary)' },
          { label: 'Defeats',   value: losses,                 colour: losses > 0 ? '#e05a5a' : 'var(--text-secondary)' },
          { label: 'Battles',   value: (battles || []).length, colour: 'var(--text-primary)' },
          { label: rank,        value: xp,                     colour: xp > 0 ? 'var(--text-gold)' : 'var(--text-secondary)', isXP: true },
        ].map((stat, i, arr) => (
          <div key={stat.label} style={{ padding: '1.25rem 0.75rem', textAlign: 'center', borderRight: i < arr.length - 1 ? '1px solid var(--border-dim)' : 'none' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: '700', color: stat.colour, marginBottom: '0.25rem' }}>
              {stat.value}{stat.isXP && <span style={{ fontSize: '0.8rem', fontWeight: '400', marginLeft: '0.2rem', opacity: 0.7 }}>xp</span>}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Achievements */}
      {(achievements && achievements.length > 0) && (
        <div style={{ border: '1px solid rgba(183,140,64,0.25)', padding: '1.75rem', marginBottom: '1.5rem', background: 'rgba(183,140,64,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>
              Achievements
            </h2>
            <Link href={`/c/${slug}/achievements`} style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textDecoration: 'none' }}>
              Hall of Honours →
            </Link>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            {achievements.map(a => (
              <div
                key={a.id}
                title={a.description || a.title}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.4rem 0.8rem',
                  background: 'var(--bg-raised)',
                  border: '1px solid rgba(183,140,64,0.3)',
                }}
              >
                <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{a.icon}</span>
                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>{a.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Award achievement shortcut (organiser only, not on own profile to keep it clean) */}
      {isOrganiser && !isOwnProfile && (
        <div style={{ marginBottom: '1.5rem', textAlign: 'right' }}>
          <Link href={`/c/${slug}/achievements/new`} style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textDecoration: 'none' }}>
            + Award achievement to {username} →
          </Link>
        </div>
      )}

      {/* Faction assignment */}
      <div style={{ border: '1px solid var(--border-dim)', padding: '1.75rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '1.25rem' }}>
          Faction
        </h2>
        {assignedFaction ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: isOwnProfile ? '1.25rem' : '0' }}>
            <div style={{ width: '12px', height: '12px', background: assignedFaction.colour, transform: 'rotate(45deg)', flexShrink: 0 }} />
            <Link href={`/c/${slug}/faction/${assignedFaction.id}`} style={{ textDecoration: 'none' }}>
              <span style={{ fontSize: '1rem', fontWeight: '600', color: assignedFaction.colour }}>{assignedFaction.name}</span>
            </Link>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem', marginBottom: isOwnProfile ? '1.25rem' : '0' }}>
            No faction assigned yet.
          </p>
        )}
        {isOwnProfile && (
          <>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Your default faction is pre-selected when you log a battle.
            </p>
            <SetFactionForm
              campaignId={campaign.id}
              currentFactionId={membership.faction_id || ''}
              factions={factions || []}
            />
          </>
        )}
      </div>

      {/* Campaign Army / Crusade Tracker */}
      {(isOwnProfile || isOrganiser || campaignArmyRecord) && (
        <CampaignArmySection
          campaignId={campaign.id}
          playerArmies={playerArmies ?? []}
          existingRecord={campaignArmyRecord}
          linkedArmy={campaignLinkedArmy}
          isOwnProfile={isOwnProfile}
          canEdit={isOwnProfile || isOrganiser}
          armyUnits={campaignArmyUnits}
          crusadeUnits={crusadeUnitRecords}
        />
      )}

      {/* Army Portfolio */}
      {((playerArmies && playerArmies.length > 0) || isOwnProfile) && (
        <div style={{ border: '1px solid var(--border-dim)', padding: '1.75rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>
              Army Portfolio
            </h2>
            {isOwnProfile && (
              <Link href="/armies/new" style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textDecoration: 'none' }}>
                + New Army
              </Link>
            )}
          </div>

          {playerArmies && playerArmies.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
              {playerArmies.map(army => (
                <Link key={army.id} href={`/armies/${army.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ border: '1px solid var(--border-dim)', overflow: 'hidden' }}>
                    <div style={{ width: '100%', aspectRatio: '16/9', background: 'var(--surface-2)', overflow: 'hidden' }}>
                      {army.cover_image_url
                        ? <img src={army.cover_image_url} alt={army.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '8px', height: '8px', background: 'var(--border-dim)', transform: 'rotate(45deg)' }} />
                          </div>
                      }
                    </div>
                    <div style={{ padding: '0.75rem' }}>
                      <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {army.name}
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.48rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>
                        {[army.game_system, army.faction_name].filter(Boolean).join(' · ') || 'Portfolio'}
                      </div>
                      {isOwnProfile && (
                        <Link href={`/armies/${army.id}/edit`} style={{ display: 'block', marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.72rem', textDecoration: 'none' }}>
                          Edit →
                        </Link>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            isOwnProfile && (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.88rem' }}>
                You haven't added any armies yet. <Link href="/armies/new" style={{ color: 'var(--text-gold)', textDecoration: 'none' }}>Create your first army →</Link>
              </p>
            )
          )}
        </div>
      )}

      {/* Battle history */}
      <div style={{ border: '1px solid var(--border-dim)', padding: '1.75rem', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>
            Battle History
          </h2>
          {isOwnProfile && (
            <Link href={`/c/${slug}/battle/new`} style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textDecoration: 'none' }}>
              Log battle →
            </Link>
          )}
        </div>

        {battles && battles.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {battles.map(battle => {
              const isAttacker   = battle.attacker_player_id === userId;
              const myFactionId  = isAttacker ? battle.attacker_faction_id : battle.defender_faction_id;
              const oppFactionId = isAttacker ? battle.defender_faction_id : battle.attacker_faction_id;
              const oppPlayerId  = isAttacker ? battle.defender_player_id : battle.attacker_player_id;
              const myFaction    = factionMap[myFactionId];
              const oppFaction   = factionMap[oppFactionId];
              const oppPlayer    = opponentMap[oppPlayerId];
              const result       = calcResult(battle);
              const resultLabel  = result === 'win' ? 'Victory' : result === 'draw' ? 'Draw' : 'Defeat';
              const resultColour = result === 'win' ? (myFaction?.colour || 'var(--text-gold)') : result === 'draw' ? 'var(--text-muted)' : '#e05a5a';
              const myScore      = isAttacker ? battle.attacker_score : battle.defender_score;
              const theirScore   = isAttacker ? battle.defender_score : battle.attacker_score;
              const hasScores    = battle.attacker_score > 0 || battle.defender_score > 0;
              const date         = new Date(battle.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

              return (
                <Link key={battle.id} href={`/c/${slug}/battle/${battle.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 0', borderBottom: '1px solid var(--border-dim)', cursor: 'pointer' }}>
                    <div style={{ width: '6px', height: '6px', background: resultColour, transform: 'rotate(45deg)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        <span style={{ color: myFaction?.colour || 'var(--text-secondary)' }}>{myFaction?.name ?? '?'}</span>
                        <span style={{ color: 'var(--text-muted)' }}> vs </span>
                        <span style={{ color: oppFaction?.colour || 'var(--text-secondary)' }}>{oppFaction?.name ?? '?'}</span>
                        {oppPlayer && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}> · {oppPlayer.username}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.2rem', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: resultColour }}>
                          {resultLabel}
                        </span>
                        {hasScores && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{myScore}–{theirScore}</span>
                        )}
                      </div>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', flexShrink: 0 }}>{date} →</span>
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

      {/* Actions */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link href={`/c/${slug}/players`}>
          <button className="btn-secondary">← All Players</button>
        </Link>
        {isOwnProfile && (
          <Link href={`/c/${slug}/battle/new`}>
            <button className="btn-primary">Log a Battle</button>
          </Link>
        )}
      </div>
    </div>
  );
}
