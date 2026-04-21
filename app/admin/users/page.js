import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata = {
  title: 'All Users · Admin · BattleSphere',
};

export default async function AdminUsers() {
  const supabase = createAdminClient();

  // All profiles, newest first
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  const userIds = (profiles || []).map(p => p.id);

  // Campaign memberships — need user_id + campaign_id for counts and profile links
  const { data: memberships } = userIds.length > 0
    ? await supabase.from('campaign_members').select('user_id, campaign_id').in('user_id', userIds)
    : { data: [] };

  // Campaigns — need slug for profile links
  const campaignIds = [...new Set((memberships || []).map(m => m.campaign_id))];
  const { data: campaigns } = campaignIds.length > 0
    ? await supabase.from('campaigns').select('id, slug').in('id', campaignIds)
    : { data: [] };

  const campaignSlugById = Object.fromEntries((campaigns || []).map(c => [c.id, c.slug]));

  // Per-user: campaign count + first campaign slug (for profile link)
  const memberCountMap = {};
  const userFirstCampaignSlug = {};
  (memberships || []).forEach(m => {
    memberCountMap[m.user_id] = (memberCountMap[m.user_id] || 0) + 1;
    if (!userFirstCampaignSlug[m.user_id] && campaignSlugById[m.campaign_id]) {
      userFirstCampaignSlug[m.user_id] = campaignSlugById[m.campaign_id];
    }
  });

  // Email addresses — fetch individually by profile ID.
  // We avoid listUsers() because directly SQL-inserted demo accounts can have
  // missing auth columns that cause the bulk query to fail entirely.
  const emailMap = {};
  let authError = null;
  await Promise.all(
    userIds.map(async (id) => {
      const { data, error } = await supabase.auth.admin.getUserById(id);
      if (data?.user?.email) emailMap[id] = data.user.email;
      if (error && !authError) authError = error;
    })
  );

  const colHeaderStyle = {
    fontFamily: 'var(--font-display)',
    fontSize: '0.54rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
  };

  const COLS = '1.2fr 2fr 90px 140px 90px';

  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>

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
        <h1 style={{ fontSize: '2.2rem', fontWeight: '700' }}>
          All Users ({(profiles || []).length})
        </h1>
      </div>

      {authError && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '0.85rem 1.25rem',
          border: '1px solid rgba(224,90,90,0.4)',
          background: 'rgba(224,90,90,0.07)',
          fontSize: '0.85rem',
          color: '#e05a5a',
        }}>
          ⚠ Could not load email addresses — auth.admin.listUsers failed.
          Check that <code>SUPABASE_SERVICE_ROLE_KEY</code> is set correctly in Vercel env vars.
          Error: {authError.message}
        </div>
      )}

      <div style={{ border: '1px solid var(--border-dim)' }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: COLS,
          gap: '1rem',
          padding: '0.7rem 1.25rem',
          borderBottom: '1px solid var(--border-dim)',
          background: 'rgba(255,255,255,0.02)',
        }}>
          {['Username', 'Email', 'Campaigns', 'Registered', ''].map(h => (
            <span key={h} style={colHeaderStyle}>{h}</span>
          ))}
        </div>

        {(profiles || []).length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No users found.
          </div>
        ) : (
          (profiles || []).map(p => {
            const email      = emailMap[p.id] ?? '—';
            const campaigns  = memberCountMap[p.id] || 0;
            const created    = new Date(p.created_at).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric',
            });
            const firstSlug  = userFirstCampaignSlug[p.id];

            return (
              <div key={p.id} style={{
                display: 'grid',
                gridTemplateColumns: COLS,
                gap: '1rem',
                padding: '0.85rem 1.25rem',
                borderBottom: '1px solid var(--border-dim)',
                alignItems: 'center',
              }}>
                {/* Username + admin badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.9rem',
                    color: 'var(--text-primary)',
                    fontWeight: p.is_admin ? '600' : '400',
                  }}>
                    {p.username}
                  </span>
                  {p.is_admin && (
                    <span style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '0.48rem',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: '#e05a5a',
                      background: 'rgba(224,90,90,0.1)',
                      padding: '0.12rem 0.35rem',
                      border: '1px solid rgba(224,90,90,0.3)',
                    }}>
                      Admin
                    </span>
                  )}
                </div>

                {/* Email */}
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {email}
                </div>

                {/* Campaign count */}
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                  {campaigns}
                </div>

                {/* Registered date */}
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {created}
                </div>

                {/* Profile link */}
                <div>
                  {firstSlug ? (
                    <Link href={`/c/${firstSlug}/player/${p.id}`} style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '0.54rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: '#e05a5a',
                      textDecoration: 'none',
                    }}>
                      Profile →
                    </Link>
                  ) : (
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>—</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
