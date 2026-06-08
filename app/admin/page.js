import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import AdminCampaignsTable from './AdminCampaignsTable';
import { scoreCampaign, activityStatus } from './engagementScore';

export const metadata = {
  title: 'Platform Overview · Admin · BattleSphere',
};

export default async function SuperAdminOverview() {
  // Auth guard — super admin only
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) redirect('/login');
  const { data: selfProfile } = await authClient.from('profiles').select('*').eq('id', user.id).limit(1);
  if (!selfProfile?.[0]?.is_admin) redirect('/dashboard');

  const supabase = createAdminClient();

  // ── Core data ────────────────────────────────────────────────────────────────

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false });

  const campaignIds = (campaigns || []).map(c => c.id);
  const organiserIds = [...new Set((campaigns || []).map(c => c.organiser_id))];

  // ── Scoring data (all parallel) ───────────────────────────────────────────────

  const [
    { data: memberRows },
    { data: battleRows },
    { data: organiserProfiles },
    { data: territories },
    { data: events },
  ] = await Promise.all([
    campaignIds.length > 0
      ? supabase.from('campaign_members').select('campaign_id').in('campaign_id', campaignIds)
      : { data: [] },
    campaignIds.length > 0
      ? supabase.from('battles').select('id, campaign_id, created_at').in('campaign_id', campaignIds)
      : { data: [] },
    organiserIds.length > 0
      ? supabase.from('profiles').select('id, username').in('id', organiserIds)
      : { data: [] },
    campaignIds.length > 0
      ? supabase.from('territories').select('id, campaign_id, image_url, description').in('campaign_id', campaignIds)
      : { data: [] },
    campaignIds.length > 0
      ? supabase.from('campaign_events').select('id, campaign_id, created_at').in('campaign_id', campaignIds)
      : { data: [] },
  ]);

  // Battle photos — second wave (needs battle IDs from first wave)
  const battleIds = (battleRows || []).map(b => b.id);
  const { data: battlePhotos } = battleIds.length > 0
    ? await supabase.from('battle_photos').select('battle_id').in('battle_id', battleIds)
    : { data: [] };

  // Platform totals for stat cards
  const { count: totalUsers   } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  const { count: totalBattles } = await supabase.from('battles').select('*', { count: 'exact', head: true });
  const { count: totalArmies  } = await supabase.from('armies').select('*', { count: 'exact', head: true });

  // ── Build lookup maps ────────────────────────────────────────────────────────

  const profileMap = Object.fromEntries((organiserProfiles || []).map(p => [p.id, p]));

  const memberCountMap = {};
  (memberRows || []).forEach(r => {
    memberCountMap[r.campaign_id] = (memberCountMap[r.campaign_id] || 0) + 1;
  });

  function groupBy(arr, key) {
    const map = {};
    for (const item of (arr || [])) {
      const k = item[key];
      if (!map[k]) map[k] = [];
      map[k].push(item);
    }
    return map;
  }

  const battlesByCampaign    = groupBy(battleRows,    'campaign_id');
  const terrByCampaign       = groupBy(territories,   'campaign_id');
  const eventsByCampaign     = groupBy(events,        'campaign_id');
  const photosByBattle       = groupBy(battlePhotos,  'battle_id');

  // ── Compute scored rows ───────────────────────────────────────────────────────

  const campaignRows = (campaigns || []).map(c => {
    const cBattles     = battlesByCampaign[c.id] || [];
    const cTerritories = terrByCampaign[c.id]    || [];
    const cEvents      = eventsByCampaign[c.id]  || [];
    const cMemberCount = memberCountMap[c.id]     || 0;
    const cPhotos      = cBattles.flatMap(b => photosByBattle[b.id] || []);

    const score = scoreCampaign(c, {
      memberCount:  cMemberCount,
      battles:      cBattles,
      territories:  cTerritories,
      events:       cEvents,
      battlePhotos: cPhotos,
    });

    const allTimes = [
      ...cBattles.map(b => b.created_at),
      ...cEvents.map(e => e.created_at),
    ].filter(Boolean).sort().reverse();
    const lastActiveIso = allTimes[0] || null;
    const status = activityStatus(lastActiveIso);

    return {
      id:                c.id,
      name:              c.name,
      slug:              c.slug,
      setting:           c.setting || null,
      organiserUsername: profileMap[c.organiser_id]?.username ?? null,
      memberCount:       cMemberCount,
      battleCount:       cBattles.length,
      score,
      lastActiveIso,
      activityLabel:     status.label,
      activityColor:     status.color,
      activityDot:       status.dot,
      created_at:        c.created_at,
    };
  });

  // ── Stat card helper ─────────────────────────────────────────────────────────

  const statCard = (label, value) => (
    <div key={label} style={{
      border: '1px solid var(--border-dim)',
      padding: '1.75rem',
      textAlign: 'center',
      background: 'rgba(255,255,255,0.01)',
    }}>
      <div style={{ fontSize: '2.2rem', fontWeight: '700', color: 'var(--gold)', marginBottom: '0.4rem' }}>
        {value ?? '…'}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '0.58rem',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
      }}>
        {label}
      </div>
    </div>
  );

  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '1400px', margin: '0 auto' }}>

      {/* Page header */}
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
        <h1 style={{ fontSize: '2.2rem', fontWeight: '700' }}>BattleSphere Overview</h1>
      </div>

      {/* Quick links */}
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/admin/announcements">
          <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.5rem 1.1rem' }}>
            ✦ Platform Announcements →
          </button>
        </Link>
      </div>

      {/* Platform stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '3rem' }}>
        {statCard('Total Campaigns', (campaigns || []).length)}
        {statCard('Registered Users', totalUsers)}
        {statCard('Battles Logged', totalBattles)}
        {statCard('Army Portfolios', totalArmies)}
      </div>

      {/* Campaigns table */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.64rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--text-gold)',
            margin: 0,
          }}>
            All Campaigns ({(campaigns || []).length})
          </h2>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            — click Score or Last Active to sort
          </span>
        </div>

        <AdminCampaignsTable rows={campaignRows} />
      </div>

    </div>
  );
}
