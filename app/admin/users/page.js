import { createAdminClient } from '@/lib/supabase/admin';
import AdminUsersTable from '../AdminUsersTable';
import { scoreCampaign, scoreArmy, activityStatus } from '../engagementScore';

export const metadata = {
  title: 'All Users · Admin · BattleSphere',
};

export default async function AdminUsers() {
  const supabase = createAdminClient();

  // ── Core user data ────────────────────────────────────────────────────────────

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  const userIds = (profiles || []).map(p => p.id);

  // ── All supporting data (parallel) ────────────────────────────────────────────

  const [
    { data: memberships },
    { data: armies },
    { data: battles },
    { data: allCampaigns },
  ] = await Promise.all([
    userIds.length > 0
      ? supabase.from('campaign_members').select('user_id, campaign_id').in('user_id', userIds)
      : { data: [] },
    userIds.length > 0
      ? supabase.from('armies').select('id, player_id, name, description, is_public, faction, game_system, updated_at, created_at').in('player_id', userIds)
      : { data: [] },
    userIds.length > 0
      ? supabase.from('battles').select('id, attacker_player_id, defender_player_id, created_at, army_id_p1, army_id_p2')
          .or(`attacker_player_id.in.(${userIds.join(',')}),defender_player_id.in.(${userIds.join(',')})`)
      : { data: [] },
    // Campaigns organised by these users
    userIds.length > 0
      ? supabase.from('campaigns').select('id, organiser_id, created_at').in('organiser_id', userIds)
      : { data: [] },
  ]);

  // For army scoring — need unit counts and photos
  const armyIds = (armies || []).map(a => a.id);
  const [
    { data: allUnits },
    { data: allUnitPhotos },
    { data: allDeployments },
  ] = await Promise.all([
    armyIds.length > 0
      ? supabase.from('army_units').select('id, army_id').in('army_id', armyIds)
      : { data: [] },
    armyIds.length > 0
      ? supabase.from('army_unit_photos').select('army_unit_id, is_portrait')
      : { data: [] },
    armyIds.length > 0
      ? supabase.from('campaign_army_records').select('army_id').in('army_id', armyIds)
      : { data: [] },
  ]);

  // For campaign scoring — need members, battles, territories, events, photos
  const campaignIds = (allCampaigns || []).map(c => c.id);
  const [
    { data: campMembers },
    { data: campBattles },
    { data: campTerritories },
    { data: campEvents },
  ] = await Promise.all([
    campaignIds.length > 0
      ? supabase.from('campaign_members').select('campaign_id').in('campaign_id', campaignIds)
      : { data: [] },
    campaignIds.length > 0
      ? supabase.from('battles').select('id, campaign_id, created_at').in('campaign_id', campaignIds)
      : { data: [] },
    campaignIds.length > 0
      ? supabase.from('territories').select('id, campaign_id, image_url, description').in('campaign_id', campaignIds)
      : { data: [] },
    campaignIds.length > 0
      ? supabase.from('campaign_events').select('id, campaign_id, created_at').in('campaign_id', campaignIds)
      : { data: [] },
  ]);

  // Battle photos for campaign battles
  const campBattleIds = (campBattles || []).map(b => b.id);
  const { data: campBattlePhotos } = campBattleIds.length > 0
    ? await supabase.from('battle_photos').select('battle_id').in('battle_id', campBattleIds)
    : { data: [] };

  // Email addresses
  const emailMap = {};
  await Promise.all(
    userIds.map(async (id) => {
      const { data } = await supabase.auth.admin.getUserById(id);
      if (data?.user?.email) emailMap[id] = data.user.email;
    })
  );

  // ── Build lookup maps ─────────────────────────────────────────────────────────

  // Campaigns slug for profile links
  const campaignIdsByUser = {};  // user_id → [campaign_id]
  (memberships || []).forEach(m => {
    if (!campaignIdsByUser[m.user_id]) campaignIdsByUser[m.user_id] = [];
    campaignIdsByUser[m.user_id].push(m.campaign_id);
  });

  // Armies by owner
  const armiesByUser = {};
  (armies || []).forEach(a => {
    if (!armiesByUser[a.player_id]) armiesByUser[a.player_id] = [];
    armiesByUser[a.player_id].push(a);
  });

  // Battles by user (as attacker or defender)
  const battlesByUser = {};
  const lastBattleByUser = {};
  (battles || []).forEach(b => {
    const addTo = (uid) => {
      if (!battlesByUser[uid]) battlesByUser[uid] = [];
      battlesByUser[uid].push(b);
      if (!lastBattleByUser[uid] || b.created_at > lastBattleByUser[uid]) {
        lastBattleByUser[uid] = b.created_at;
      }
    };
    if (b.attacker_player_id) addTo(b.attacker_player_id);
    if (b.defender_player_id) addTo(b.defender_player_id);
  });

  // Organised campaigns by user
  const campaignsByOrganiser = {};
  (allCampaigns || []).forEach(c => {
    if (!campaignsByOrganiser[c.organiser_id]) campaignsByOrganiser[c.organiser_id] = [];
    campaignsByOrganiser[c.organiser_id].push(c);
  });

  // Army scoring helpers
  const unitsByArmy = {};
  (allUnits || []).forEach(u => {
    if (!unitsByArmy[u.army_id]) unitsByArmy[u.army_id] = [];
    unitsByArmy[u.army_id].push(u);
  });
  const photosByUnit = {};
  (allUnitPhotos || []).forEach(p => {
    if (!photosByUnit[p.army_unit_id]) photosByUnit[p.army_unit_id] = [];
    photosByUnit[p.army_unit_id].push(p);
  });
  const deployedArmyIds = new Set((allDeployments || []).map(d => d.army_id));

  const battleCountByArmy = {};
  (battles || []).forEach(b => {
    if (b.army_id_p1) battleCountByArmy[b.army_id_p1] = (battleCountByArmy[b.army_id_p1] || 0) + 1;
    if (b.army_id_p2) battleCountByArmy[b.army_id_p2] = (battleCountByArmy[b.army_id_p2] || 0) + 1;
  });

  // Campaign scoring helpers
  function groupBy(arr, key) {
    const map = {};
    for (const item of (arr || [])) {
      const k = item[key];
      if (!map[k]) map[k] = [];
      map[k].push(item);
    }
    return map;
  }
  const campMemberCountMap = {};
  (campMembers || []).forEach(r => { campMemberCountMap[r.campaign_id] = (campMemberCountMap[r.campaign_id] || 0) + 1; });
  const campBattlesByC   = groupBy(campBattles,       'campaign_id');
  const campTerrByC      = groupBy(campTerritories,   'campaign_id');
  const campEventsByC    = groupBy(campEvents,        'campaign_id');
  const campPhotosByB    = groupBy(campBattlePhotos,  'battle_id');

  // ── Compute scored rows ───────────────────────────────────────────────────────

  const userRows = (profiles || []).map(p => {
    const userArmies     = armiesByUser[p.id]         || [];
    const userBattles    = battlesByUser[p.id]         || [];
    const userCampaigns  = campaignsByOrganiser[p.id]  || [];

    // Score each army
    const armyScores = userArmies.map(a => {
      const units      = unitsByArmy[a.id] || [];
      const unitPhotos = units.flatMap(u => photosByUnit[u.id] || []);
      return scoreArmy(a, {
        unitCount:    units.length,
        unitPhotos,
        isDeployed:   deployedArmyIds.has(a.id),
        battleCount:  battleCountByArmy[a.id] || 0,
      });
    });

    // Score each organised campaign
    const campaignScores = userCampaigns.map(c => {
      const cBattles   = campBattlesByC[c.id]   || [];
      const cTerr      = campTerrByC[c.id]       || [];
      const cEvents    = campEventsByC[c.id]     || [];
      const cPhotos    = cBattles.flatMap(b => campPhotosByB[b.id] || []);
      return scoreCampaign(c, {
        memberCount:  campMemberCountMap[c.id] || 0,
        battles:      cBattles,
        territories:  cTerr,
        events:       cEvents,
        battlePhotos: cPhotos,
      });
    });

    const allScores   = [...armyScores, ...campaignScores];
    const bestScore   = allScores.length ? Math.max(...allScores) : 0;

    // Label for the best score tooltip
    let bestScoreLabel = ''
    if (bestScore > 0) {
      const bestArmyIdx = armyScores.indexOf(Math.max(...armyScores, -1));
      const bestCampIdx = campaignScores.indexOf(Math.max(...campaignScores, -1));
      if (armyScores.length && Math.max(...armyScores) >= (campaignScores.length ? Math.max(...campaignScores) : -1)) {
        bestScoreLabel = `Best army: ${userArmies[bestArmyIdx]?.name ?? ''}`
      } else if (campaignScores.length) {
        bestScoreLabel = `Best campaign: ${userCampaigns[bestCampIdx]?.id ?? ''}`
      }
    }

    // Last active = max of last battle, last army updated_at
    const lastArmyUpdate = userArmies.map(a => a.updated_at).filter(Boolean).sort().reverse()[0] || null;
    const lastBattle     = lastBattleByUser[p.id] || null;
    const allTimes       = [lastArmyUpdate, lastBattle].filter(Boolean).sort().reverse();
    const lastActiveIso  = allTimes[0] || null;
    const status         = activityStatus(lastActiveIso);

    // Count how many campaigns the user is *in* (not just organised)
    const campaignCount = (campaignIdsByUser[p.id] || []).length;

    return {
      id:             p.id,
      username:       p.username,
      email:          emailMap[p.id] ?? null,
      is_admin:       p.is_admin,
      campaignCount,
      armyCount:      userArmies.length,
      battleCount:    userBattles.length,
      bestScore:      bestScore || null,
      bestScoreLabel,
      lastActiveIso,
      activityLabel:  status.label,
      activityColor:  status.color,
      activityDot:    status.dot,
      created_at:     p.created_at,
    };
  });

  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '1500px', margin: '0 auto' }}>

      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.58rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: '#e05a5a',
          marginBottom: '0.5rem',
        }}>
          Platform Administration
        </p>
        <h1 style={{ fontSize: '2.2rem', fontWeight: '700' }}>
          All Users ({(profiles || []).length})
        </h1>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Best Score = highest engagement score across that user's armies + organised campaigns · click column headers to sort
        </span>
      </div>

      <AdminUsersTable rows={userRows} />
    </div>
  );
}
