import { createAdminClient } from '@/lib/supabase/admin';
import AdminBattlesTable from '../AdminBattlesTable';
import { scoreBattle } from '../engagementScore';

export const metadata = {
  title: 'All Battles · Admin · BattleSphere',
};

export default async function AdminBattles() {
  const supabase = createAdminClient();

  // ── Core data ────────────────────────────────────────────────────────────────

  const { data: battles } = await supabase
    .from('battles')
    .select('*')
    .order('created_at', { ascending: false });

  const battleIds   = (battles || []).map(b => b.id);
  const campaignIds = [...new Set((battles || []).map(b => b.campaign_id).filter(Boolean))];
  const playerIds   = [...new Set([
    ...(battles || []).map(b => b.attacker_player_id),
    ...(battles || []).map(b => b.defender_player_id),
  ].filter(Boolean))];

  // ── Scoring + lookup data (parallel) ─────────────────────────────────────────

  const [
    { data: campaigns },
    { data: profiles },
    { data: battlePhotos },
  ] = await Promise.all([
    campaignIds.length > 0
      ? supabase.from('campaigns').select('id, name, slug').in('id', campaignIds)
      : { data: [] },
    playerIds.length > 0
      ? supabase.from('profiles').select('id, username').in('id', playerIds)
      : { data: [] },
    battleIds.length > 0
      ? supabase.from('battle_photos').select('battle_id').in('battle_id', battleIds)
      : { data: [] },
  ]);

  const campaignById = Object.fromEntries((campaigns || []).map(c => [c.id, c]));
  const profileById  = Object.fromEntries((profiles  || []).map(p => [p.id, p]));

  // Photo count per battle
  const photoCountByBattle = {};
  (battlePhotos || []).forEach(p => {
    photoCountByBattle[p.battle_id] = (photoCountByBattle[p.battle_id] || 0) + 1;
  });

  // ── Compute scored rows ───────────────────────────────────────────────────────

  const battleRows = (battles || []).map(b => {
    const photoCount = photoCountByBattle[b.id] || 0;
    const score      = scoreBattle(b, { photoCount });
    const campaign   = campaignById[b.campaign_id];

    return {
      id:               b.id,
      campaignName:     campaign?.name ?? null,
      campaignSlug:     campaign?.slug ?? null,
      attackerUsername: profileById[b.attacker_player_id]?.username ?? null,
      defenderUsername: profileById[b.defender_player_id]?.username ?? null,
      result:           b.result,
      hasNarrative:     !!(b.attacker_narrative || b.defender_narrative),
      photoCount,
      score,
      created_at:       b.created_at,
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
          All Battles ({(battles || []).length})
        </h1>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Click Score or Date to sort · ✦ Chronicle = battle narrative written
        </span>
      </div>

      <AdminBattlesTable rows={battleRows} />
    </div>
  );
}
