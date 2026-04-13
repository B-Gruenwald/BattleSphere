import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import CampaignArmySection from '@/app/components/CampaignArmySection';
import FactionChangeInline from '@/app/components/FactionChangeInline';
import BattleHistoryPanel from '@/app/components/BattleHistoryPanel';
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

  // Achievement icons (show first 4, then "+N more")
  const achList    = achievements ?? [];
  const achVisible = achList.slice(0, 4);
  const achExtra   = achList.length - 4;

  return (
    <div style={{ padding: '1.75rem 1.5rem 3rem', maxWidth: '900px', margin: '0 auto' }}>

      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <Link href={`/c/${slug}`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.75rem' }}>{campaign.name}</Link>
        <span style={{ color: 'var(--border-dim)', fontSize: '0.75rem' }}>›</span>
        <Link href={`/c/${slug}/players`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.75rem' }}>Players</Link>
        <span style={{ color: 'var(--border-dim)', fontSize: '0.75rem' }}>›</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{username}</span>
      </nav>

      {/* ── HERO ROW ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', border: '1px solid var(--border-dim)', background: 'var(--surface-1)', marginBottom: '1rem', flexWrap: 'wrap' }}>

        {/* Avatar */}
        <div style={{ width: '48px', height: '48px', flexShrink: 0, background: 'var(--surface-2)', border: `2px solid ${avatarColour}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: '700', color: avatarColour }}>
          {initials}
        </div>

        {/* Identity */}
        <div style={{ flex: 1, minWidth: '140px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 'clamp(1.1rem, 3vw, 1.4rem)', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1.1 }}>
              {username}
            </h1>
            {isOwnProfile && (
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.44rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', border: '1px solid var(--gold)', padding: '0.15rem 0.4rem' }}>
                You
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.5rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              {membership.role}
            </span>
            <span style={{ color: 'var(--border-mid)', fontSize: '0.75rem' }}>·</span>
            {/* Faction inline with change toggle */}
            <FactionChangeInline
              assignedFaction={assignedFaction}
              slug={slug}
              campaignId={campaign.id}
              currentFactionId={membership.faction_id || ''}
              factions={factions || []}
              isOwnProfile={isOwnProfile}
            />
          </div>
        </div>

        {/* W / D / L + Rank — compact stat cells */}
        <div style={{ display: 'flex', borderLeft: '1px solid var(--border-dim)', flexShrink: 0 }}>
          {[
            { label: 'Won',  value: wins,   colour: wins > 0 ? (assignedFaction?.colour || 'var(--text-gold)') : 'var(--text-muted)' },
            { label: 'Draw', value: draws,  colour: 'var(--text-muted)' },
            { label: 'Lost', value: losses, colour: losses > 0 ? '#e05a5a' : 'var(--text-muted)' },
          ].map((s, i, arr) => (
            <div key={s.label} style={{ padding: '0.4rem 0.85rem', textAlign: 'center', borderRight: '1px solid var(--border-dim)' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: s.colour, lineHeight: 1.1, marginBottom: '0.15rem' }}>{s.value}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.42rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>{s.label}</div>
            </div>
          ))}
          {/* XP Rank */}
          <div style={{ padding: '0.4rem 0.85rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: '700', color: xp > 0 ? 'var(--text-gold)' : 'var(--text-muted)', lineHeight: 1.15, marginBottom: '0.1rem' }}>{rank}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.42rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>{xp} XP</div>
          </div>
        </div>

        {/* Achievement icons */}
        {achList.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', borderLeft: '1px solid var(--border-dim)', paddingLeft: '0.85rem', flexShrink: 0 }}>
            {achVisible.map(a => (
              <span key={a.id} title={a.title} style={{ fontSize: '1rem', lineHeight: 1, cursor: 'default' }}>{a.icon}</span>
            ))}
            {achExtra > 0 && (
              <Link href={`/c/${slug}/achievements`} style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                +{achExtra}
              </Link>
            )}
          </div>
        )}

      </div>{/* /.hero */}

      {/* ── TWO-COLUMN MAIN CONTENT ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 290px', gap: '1rem', alignItems: 'start' }}>

        {/* LEFT: Campaign Army + Crusade Roster */}
        <div>
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
        </div>

        {/* RIGHT: Recent Battles + Army Portfolio */}
        <div>

          {/* Battle History Panel — shows 5, expandable */}
          <BattleHistoryPanel
            battles={battles ?? []}
            factionMap={factionMap}
            opponentMap={opponentMap}
            userId={userId}
            slug={slug}
            isOwnProfile={isOwnProfile}
          />

          {/* Army Portfolio — compact list */}
          {((playerArmies && playerArmies.length > 0) || isOwnProfile) && (
            <div style={{ border: '1px solid var(--border-dim)', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0.65rem 1rem', borderBottom: '1px solid var(--border-dim)', background: 'var(--surface-1)' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>
                  Army Portfolio
                </span>
                {isOwnProfile && (
                  <Link href="/armies/new" style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textDecoration: 'none' }}>
                    + New Army
                  </Link>
                )}
              </div>

              {playerArmies && playerArmies.length > 0 ? (
                <div style={{ padding: '0.25rem 1rem' }}>
                  {playerArmies.map(army => (
                    <Link key={army.id} href={`/armies/${army.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.55rem 0', borderBottom: '1px solid var(--border-dim)' }}>
                      {/* Tiny thumb */}
                      <div style={{ width: '38px', height: '26px', flexShrink: 0, background: 'var(--surface-2)', border: '1px solid var(--border-dim)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--border-mid)' }}>
                        {army.cover_image_url
                          ? <img src={army.cover_image_url} alt={army.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : (army.game_system?.toLowerCase().includes('40') ? '☩' : army.game_system?.toLowerCase().includes('sigmar') ? '⚔' : '◆')
                        }
                      </div>
                      {/* Name + system */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {army.name}
                        </div>
                        {(army.game_system || army.faction_name) && (
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.42rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>
                            {[army.game_system, army.faction_name].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                        {campaignArmyRecord?.army_id === army.id ? 'Active →' : (isOwnProfile ? 'Edit →' : 'View →')}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                isOwnProfile && (
                  <div style={{ padding: '1rem' }}>
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.82rem' }}>
                      No armies yet.{' '}
                      <Link href="/armies/new" style={{ color: 'var(--text-gold)', textDecoration: 'none' }}>Create one →</Link>
                    </p>
                  </div>
                )
              )}
            </div>
          )}

          {/* Organiser action */}
          {isOrganiser && !isOwnProfile && (
            <div style={{ textAlign: 'right' }}>
              <Link href={`/c/${slug}/achievements/new`} style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textDecoration: 'none' }}>
                + Award achievement to {username} →
              </Link>
            </div>
          )}

        </div>{/* /right col */}
      </div>{/* /.main-grid */}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-dim)' }}>
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
