import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

  // All campaigns, newest first
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false });

  const campaignIds = (campaigns || []).map(c => c.id);
  const organiserIds = [...new Set((campaigns || []).map(c => c.organiser_id))];

  // Member + battle counts (just the id columns — efficient)
  const { data: memberRows } = campaignIds.length > 0
    ? await supabase.from('campaign_members').select('campaign_id').in('campaign_id', campaignIds)
    : { data: [] };

  const { data: battleRows } = campaignIds.length > 0
    ? await supabase.from('battles').select('campaign_id').in('campaign_id', campaignIds)
    : { data: [] };

  // Organiser usernames
  const { data: organiserProfiles } = organiserIds.length > 0
    ? await supabase.from('profiles').select('id, username').in('id', organiserIds)
    : { data: [] };

  // Platform totals
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  const { count: totalBattles } = await supabase
    .from('battles')
    .select('*', { count: 'exact', head: true });

  // Army count for stat card
  const { count: totalArmies } = await supabase
    .from('armies')
    .select('*', { count: 'exact', head: true });

  // Build lookup maps
  const profileMap = Object.fromEntries((organiserProfiles || []).map(p => [p.id, p]));

  const memberCountMap = {};
  (memberRows || []).forEach(r => {
    memberCountMap[r.campaign_id] = (memberCountMap[r.campaign_id] || 0) + 1;
  });

  const battleCountMap = {};
  (battleRows || []).forEach(r => {
    battleCountMap[r.campaign_id] = (battleCountMap[r.campaign_id] || 0) + 1;
  });

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

  const colHeader = (label) => (
    <span key={label} style={{
      fontFamily: 'var(--font-display)',
      fontSize: '0.54rem',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
    }}>
      {label}
    </span>
  );

  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>

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

        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.64rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--text-gold)',
          marginBottom: '1.25rem',
        }}>
          All Campaigns ({(campaigns || []).length})
        </h2>

        <div style={{ border: '1px solid var(--border-dim)' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1.2fr 80px 80px 130px 110px',
            gap: '1rem',
            padding: '0.7rem 1.25rem',
            borderBottom: '1px solid var(--border-dim)',
            background: 'rgba(255,255,255,0.02)',
          }}>
            {['Campaign', 'Organiser', 'Members', 'Battles', 'Created', ''].map(colHeader)}
          </div>

          {(campaigns || []).length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No campaigns yet.
            </div>
          ) : (
            (campaigns || []).map(c => {
              const organiser = profileMap[c.organiser_id];
              const members   = memberCountMap[c.id] || 0;
              const battles   = battleCountMap[c.id] || 0;
              const created   = new Date(c.created_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric',
              });

              return (
                <div key={c.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1.2fr 80px 80px 130px 110px',
                  gap: '1rem',
                  padding: '0.9rem 1.25rem',
                  borderBottom: '1px solid var(--border-dim)',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.15rem' }}>
                      {c.name}
                    </div>
                    {c.setting && (
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        {c.setting}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {organiser?.username ?? '—'}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                    {members}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                    {battles}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {created}
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <Link href={`/admin/campaigns/${c.id}`} style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '0.54rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: '#e05a5a',
                      textDecoration: 'none',
                    }}>
                      Detail →
                    </Link>
                    <Link href={`/c/${c.slug}`} style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '0.54rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--text-muted)',
                      textDecoration: 'none',
                    }}>
                      Visit ↗
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
