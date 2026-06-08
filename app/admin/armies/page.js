import { createAdminClient } from '@/lib/supabase/admin';
import AdminArmiesTable from '../AdminArmiesTable';
import { scoreArmy, activityStatus } from '../engagementScore';

export const metadata = {
  title: 'Army Portfolios · Admin · BattleSphere',
};

export default async function AdminArmies() {
  const supabase = createAdminClient();

  // ── Core data ────────────────────────────────────────────────────────────────

  const { data: armies } = await supabase
    .from('armies')
    .select('*')
    .order('updated_at', { ascending: false });

  const armyIds  = (armies || []).map(a => a.id);
  const ownerIds = [...new Set((armies || []).map(a => a.player_id).filter(Boolean))];

  // ── Scoring data (parallel) ──────────────────────────────────────────────────

  const [
    { data: ownerProfiles },
    { data: allUnits },
    { data: allUnitPhotos },
    { data: allDeployments },
    { data: armyBattles },
  ] = await Promise.all([
    ownerIds.length > 0
      ? supabase.from('profiles').select('id, username').in('id', ownerIds)
      : { data: [] },
    armyIds.length > 0
      ? supabase.from('army_units').select('id, army_id, created_at').in('army_id', armyIds)
      : { data: [] },
    // Photos: join via army_unit_ids — fetch all unit photos for units in these armies
    // We'll cross-reference via unit map after the fact
    armyIds.length > 0
      ? supabase.from('army_unit_photos').select('unit_id, is_portrait')
      : { data: [] },
    // Campaign deployments: just need army_id to check is_deployed
    armyIds.length > 0
      ? supabase.from('campaign_army_records').select('army_id').in('army_id', armyIds)
      : { data: [] },
    // Battles where this army appears
    armyIds.length > 0
      ? supabase.from('battles').select('army_id_p1, army_id_p2, created_at')
          .or(`army_id_p1.in.(${armyIds.join(',')}),army_id_p2.in.(${armyIds.join(',')})`)
      : { data: [] },
  ]);

  // ── Lookup maps ───────────────────────────────────────────────────────────────

  const ownerMap = Object.fromEntries((ownerProfiles || []).map(p => [p.id, p]));

  // Unit IDs per army
  const unitsByArmy = {};
  (allUnits || []).forEach(u => {
    if (!unitsByArmy[u.army_id]) unitsByArmy[u.army_id] = [];
    unitsByArmy[u.army_id].push(u);
  });

  // Photos per unit_id
  const photosByUnit = {};
  (allUnitPhotos || []).forEach(p => {
    if (!photosByUnit[p.unit_id]) photosByUnit[p.unit_id] = [];
    photosByUnit[p.unit_id].push(p);
  });

  // Deployed army IDs
  const deployedArmyIds = new Set((allDeployments || []).map(d => d.army_id));

  // Battle count per army
  const battleCountByArmy = {};
  (armyBattles || []).forEach(b => {
    if (b.army_id_p1) battleCountByArmy[b.army_id_p1] = (battleCountByArmy[b.army_id_p1] || 0) + 1;
    if (b.army_id_p2) battleCountByArmy[b.army_id_p2] = (battleCountByArmy[b.army_id_p2] || 0) + 1;
  });

  // Latest battle per army (for last-active)
  const lastBattleByArmy = {};
  (armyBattles || []).forEach(b => {
    const t = b.created_at;
    if (b.army_id_p1 && (!lastBattleByArmy[b.army_id_p1] || t > lastBattleByArmy[b.army_id_p1])) lastBattleByArmy[b.army_id_p1] = t;
    if (b.army_id_p2 && (!lastBattleByArmy[b.army_id_p2] || t > lastBattleByArmy[b.army_id_p2])) lastBattleByArmy[b.army_id_p2] = t;
  });

  // ── Compute scored rows ───────────────────────────────────────────────────────

  const armyRows = (armies || []).map(a => {
    const units      = unitsByArmy[a.id] || [];
    const unitIds    = units.map(u => u.id);
    const unitPhotos = unitIds.flatMap(uid => photosByUnit[uid] || []);
    const isDeployed = deployedArmyIds.has(a.id);
    const battleCount= battleCountByArmy[a.id] || 0;

    const score = scoreArmy(a, { unitCount: units.length, unitPhotos, isDeployed, battleCount });

    // Last active = most recent of: army updated_at, last unit added, last battle
    const times = [
      a.updated_at,
      ...units.map(u => u.created_at),
      lastBattleByArmy[a.id] || null,
    ].filter(Boolean).sort().reverse();
    const lastActiveIso = times[0] || null;
    const status = activityStatus(lastActiveIso);

    const hasPortrait  = unitPhotos.some(p => p.is_portrait);
    const photoCount   = unitPhotos.length;

    return {
      id:             a.id,
      name:           a.name,
      faction:        a.faction,
      game_system:    a.game_system,
      is_public:      a.is_public,
      ownerUsername:  ownerMap[a.player_id]?.username ?? null,
      unitCount:      units.length,
      score,
      lastActiveIso,
      activityLabel:  status.label,
      activityColor:  status.color,
      activityDot:    status.dot,
      updated_at:     a.updated_at,
      created_at:     a.created_at,
      // content tags
      hasDescription: !!(a.description?.trim()),
      hasPortrait,
      photoCount,
      isDeployed:     isDeployed,
    };
  });

  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '1300px', margin: '0 auto' }}>

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
          Army Portfolios ({(armies || []).length})
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Click Score or Last Active / Updated to sort
        </span>
      </div>

      <AdminArmiesTable rows={armyRows} />
    </div>
  );
}
