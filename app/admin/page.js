import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata = {
  title: 'Platform Overview · Admin · BattleSphere',
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function fmtResult(result) {
  if (!result) return '—';
  if (result === 'attacker_wins') return 'Attacker';
  if (result === 'defender_wins') return 'Defender';
  if (result === 'draw') return 'Draw';
  return result;
}

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

  // All profiles (users), newest first
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  // All battles, newest first
  const { data: allBattles } = await supabase
    .from('battles')
    .select('*')
    .order('created_at', { ascending: false });

  // All campaign memberships (for counts + user→campaign links)
  const { data: allMembers } = await supabase
    .from('campaign_members')
    .select('*');

  // ── Build lookup maps ──────────────────────────────────────────────────
  const campaignById = Object.fromEntries((campaigns || []).map(c => [c.id, c]));
  const profileById  = Object.fromEntries((allProfiles || []).map(p => [p.id, p]));

  // Member counts per campaign
  const memberCountMap = {};
  // User → first campaign slug (for player profile links)
  const userFirstCampaignSlug = {};
  (allMembers || []).forEach(m => {
    memberCountMap[m.campaign_id] = (memberCountMap[m.campaign_id] || 0) + 1;
    if (!userFirstCampaignSlug[m.user_id] && campaignById[m.campaign_id]) {
      userFirstCampaignSlug[m.user_id] = campaignById[m.campaign_id].slug;
    }
  });

  // Battle counts per campaign
  const battleCountMap = {};
  (allBattles || []).forEach(b => {
    battleCountMap[b.campaign_id] = (battleCountMap[b.campaign_id] || 0) + 1;
  });

  // ── Shared sub-components ────────────────────────────────────────────
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

  const actionLink = (href, label, muted = false) => (
    <Link href={href} style={{
      fontFamily: 'var(--font-display)',
      fontSize: '0.54rem',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: muted ? 'var(--text-muted)' : '#e05a5a',
      textDecoration: 'none',
    }}>
      {label}
    </Link>
  );

  const sectionHeading = (label) => (
    <h2 style={{
      fontFamily: 'var(--font-display)',
      fontSize: '0.64rem',
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: 'var(--text-gold)',
      marginBottom: '1.25rem',
    }}>
      {label}
    </h2>
  );

  const emptyState = (cols, msg) => (
    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
      {msg}
    </div>
  );

  const rowStyle = (cols) => ({
    display: 'grid',
    gridTemplateColumns: cols,
    gap: '1rem',
    padding: '0.9rem 1.25rem',
    borderBottom: '1px solid var(--border-dim)',
    alignItems: 'center',
  });

  const headerRowStyle = (cols) => ({
    display: 'grid',
    gridTemplateColumns: cols,
    gap: '1rem',
    padding: '0.7rem 1.25rem',
    borderBottom: '1px solid var(--border-dim)',
    background: 'rgba(255,255,255,0.02)',
  });

  // ── Column templates ─────────────────────────────────────────────────
  const COLS_CAMPAIGNS = '2fr 1.2fr 80px 80px 130px 110px';
  const COLS_USERS     = '2fr 100px 80px 130px 100px';
  const COLS_BATTLES   = '1.4fr 1.1fr 1.1fr 90px 130px 100px';

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '3rem' }}>
        {statCard('Total Campaigns', (campaigns || []).length)}
        {statCard('Registered Users', (allProfiles || []).length)}
        {statCard('Battles Logged', (allBattles || []).length)}
      </div>

      {/* ── CAMPAIGNS ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: '3rem' }}>
        {sectionHeading(`All Campaigns (${(campaigns || []).length})`)}

        <div style={{ border: '1px solid var(--border-dim)' }}>
          <div style={headerRowStyle(COLS_CAMPAIGNS)}>
            {['Campaign', 'Organiser', 'Members', 'Battles', 'Created', ''].map(colHeader)}
          </div>

          {(campaigns || []).length === 0
            ? emptyState(COLS_CAMPAIGNS, 'No campaigns yet.')
            : (campaigns || []).map(c => {
                const organiser = profileById[c.organiser_id];
                const created   = fmtDate(c.created_at);
                return (
                  <div key={c.id} style={rowStyle(COLS_CAMPAIGNS)}>
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
                      {memberCountMap[c.id] || 0}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                      {battleCountMap[c.id] || 0}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {created}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      {actionLink(`/admin/campaigns/${c.id}`, 'Detail →')}
                      {actionLink(`/c/${c.slug}`, 'Visit ↗', true)}
                    </div>
                  </div>
                );
              })
          }
        </div>
      </div>

      {/* ── USERS ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '3rem' }}>
        {sectionHeading(`All Users (${(allProfiles || []).length})`)}

        <div style={{ border: '1px solid var(--border-dim)' }}>
          <div style={headerRowStyle(COLS_USERS)}>
            {['Username', 'Role', 'Campaigns', 'Joined', ''].map(colHeader)}
          </div>

          {(allProfiles || []).length === 0
            ? emptyState(COLS_USERS, 'No users yet.')
            : (allProfiles || []).map(p => {
                const campaignCount = (allMembers || []).filter(m => m.user_id === p.id).length;
                const firstSlug     = userFirstCampaignSlug[p.id];
                return (
                  <div key={p.id} style={rowStyle(COLS_USERS)}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {p.username || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>unnamed</span>}
                    </div>
                    <div>
                      {p.is_admin ? (
                        <span style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '0.54rem',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: '#e05a5a',
                          border: '1px solid rgba(224,90,90,0.35)',
                          padding: '0.2rem 0.45rem',
                        }}>
                          Admin
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Player</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                      {campaignCount}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {fmtDate(p.created_at)}
                    </div>
                    <div>
                      {firstSlug
                        ? actionLink(`/c/${firstSlug}/player/${p.id}`, 'Profile →')
                        : <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>—</span>
                      }
                    </div>
                  </div>
                );
              })
          }
        </div>
      </div>

      {/* ── BATTLES ───────────────────────────────────────────────── */}
      <div style={{ marginBottom: '3rem' }}>
        {sectionHeading(`All Battles (${(allBattles || []).length})`)}

        <div style={{ border: '1px solid var(--border-dim)' }}>
          <div style={headerRowStyle(COLS_BATTLES)}>
            {['Campaign', 'Attacker', 'Defender', 'Result', 'Date', ''].map(colHeader)}
          </div>

          {(allBattles || []).length === 0
            ? emptyState(COLS_BATTLES, 'No battles yet.')
            : (allBattles || []).map(b => {
                const campaign = campaignById[b.campaign_id];
                const attacker = profileById[b.attacker_player_id];
                const defender = profileById[b.defender_player_id];
                return (
                  <div key={b.id} style={rowStyle(COLS_BATTLES)}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {campaign?.name ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {attacker?.username ?? '—'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {defender?.username ?? '—'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {fmtResult(b.result)}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {fmtDate(b.created_at)}
                    </div>
                    <div>
                      {campaign
                        ? actionLink(`/c/${campaign.slug}/battle/${b.id}`, 'View →')
                        : <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>—</span>
                      }
                    </div>
                  </div>
                );
              })
          }
        </div>
      </div>

    </div>
  );
}
