import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata = {
  title: 'Campaign Detail · Admin · BattleSphere',
};

export default async function AdminCampaignDetail({ params }) {
  const { id } = await params;
  const supabase = createAdminClient();

  // Fetch the campaign
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (!campaign) notFound();

  // Factions
  const { data: factions } = await supabase
    .from('factions')
    .select('*')
    .eq('campaign_id', campaign.id)
    .order('created_at');
  const factionMap = Object.fromEntries((factions || []).map(f => [f.id, f]));

  // Members
  const { data: members } = await supabase
    .from('campaign_members')
    .select('*')
    .eq('campaign_id', campaign.id)
    .order('joined_at', { ascending: false });

  const memberUserIds = (members || []).map(m => m.user_id);
  const { data: memberProfiles } = memberUserIds.length > 0
    ? await supabase.from('profiles').select('id, username, is_admin').in('id', memberUserIds)
    : { data: [] };
  const memberProfileMap = Object.fromEntries((memberProfiles || []).map(p => [p.id, p]));

  // Organiser profile
  const organiserProfile = memberProfileMap[campaign.organiser_id] || null;

  // Recent battles (capped at 30)
  const { data: battles } = await supabase
    .from('battles')
    .select('*')
    .eq('campaign_id', campaign.id)
    .order('created_at', { ascending: false })
    .limit(30);

  // Total battle count (for the stats strip)
  const { count: totalBattleCount } = await supabase
    .from('battles')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaign.id);

  // Pending join requests
  const { data: joinRequests } = await supabase
    .from('join_requests')
    .select('*')
    .eq('campaign_id', campaign.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  const requestUserIds = (joinRequests || []).map(r => r.user_id);
  const { data: requestProfiles } = requestUserIds.length > 0
    ? await supabase.from('profiles').select('id, username').in('id', requestUserIds)
    : { data: [] };
  const requestProfileMap = Object.fromEntries((requestProfiles || []).map(p => [p.id, p]));

  const labelStyle = {
    fontFamily: 'var(--font-display)',
    fontSize: '0.64rem',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--text-gold)',
    marginBottom: '1rem',
  };

  const colHeaderStyle = {
    fontFamily: 'var(--font-display)',
    fontSize: '0.52rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
  };

  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '1150px', margin: '0 auto' }}>

      {/* Breadcrumb */}
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
        <Link href="/admin" style={{ ...colHeaderStyle, color: 'var(--text-muted)', textDecoration: 'none' }}>
          Admin
        </Link>
        <span style={{ color: 'var(--border-dim)' }}>›</span>
        <span style={{ ...colHeaderStyle, color: 'var(--text-secondary)' }}>{campaign.name}</span>
      </div>

      {/* Campaign header */}
      <div style={{
        marginBottom: '2.5rem',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap',
      }}>
        <div>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.58rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#e05a5a',
            marginBottom: '0.5rem',
          }}>
            Campaign Detail
          </p>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.6rem' }}>{campaign.name}</h1>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Organiser: <strong style={{ color: 'var(--text-primary)' }}>{organiserProfile?.username ?? '—'}</strong>
            </span>
            {campaign.setting && (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                {campaign.setting}
              </span>
            )}
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Created {new Date(campaign.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href={`/c/${campaign.slug}`}>
            <button className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
              View Campaign ↗
            </button>
          </Link>
          <Link href={`/campaign/${campaign.slug}`}>
            <button className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
              Public Page ↗
            </button>
          </Link>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
        {[
          { label: 'Members',          value: (members || []).length },
          { label: 'Factions',         value: (factions || []).length },
          { label: 'Battles (total)',  value: totalBattleCount ?? (battles || []).length },
          { label: 'Pending Requests', value: (joinRequests || []).length },
        ].map(s => (
          <div key={s.label} style={{
            border: '1px solid var(--border-dim)',
            padding: '1.25rem',
            textAlign: 'center',
            background: 'rgba(255,255,255,0.01)',
          }}>
            <div style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--gold)', marginBottom: '0.3rem' }}>
              {s.value}
            </div>
            <div style={{ ...colHeaderStyle, color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Two-column: members + join requests */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>

        {/* Members */}
        <div>
          <h2 style={labelStyle}>Members ({(members || []).length})</h2>
          <div style={{ border: '1px solid var(--border-dim)' }}>
            {(members || []).length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No members.
              </div>
            ) : (
              (members || []).map(m => {
                const profile = memberProfileMap[m.user_id];
                const faction = factionMap[m.faction_id];
                return (
                  <div key={m.user_id} style={{
                    padding: '0.8rem 1rem',
                    borderBottom: '1px solid var(--border-dim)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.9rem',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        flexWrap: 'wrap',
                      }}>
                        {profile?.username ?? '—'}
                        {profile?.is_admin && (
                          <span style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '0.48rem',
                            letterSpacing: '0.1em',
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
                      {faction && (
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <span style={{ display: 'inline-block', width: '7px', height: '7px', background: faction.colour, borderRadius: '50%', flexShrink: 0 }} />
                          {faction.name}
                        </div>
                      )}
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '0.5rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: m.role === 'organiser' ? 'var(--text-gold)' : 'var(--text-muted)',
                      background: m.role === 'organiser' ? 'rgba(183,140,64,0.1)' : 'transparent',
                      padding: m.role === 'organiser' ? '0.15rem 0.4rem' : '0',
                      border: m.role === 'organiser' ? '1px solid rgba(183,140,64,0.3)' : 'none',
                      flexShrink: 0,
                    }}>
                      {m.role}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pending join requests */}
        <div>
          <h2 style={labelStyle}>Pending Join Requests ({(joinRequests || []).length})</h2>
          <div style={{ border: '1px solid var(--border-dim)' }}>
            {(joinRequests || []).length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No pending requests.
              </div>
            ) : (
              (joinRequests || []).map(r => {
                const profile = requestProfileMap[r.user_id];
                return (
                  <div key={r.id} style={{ padding: '0.8rem 1rem', borderBottom: '1px solid var(--border-dim)' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                      {profile?.username ?? '—'}
                    </div>
                    {r.message && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '0.2rem' }}>
                        "{r.message}"
                      </div>
                    )}
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Recent battles */}
      <div>
        <h2 style={labelStyle}>
          Recent Battles {totalBattleCount > 30 ? `(showing latest 30 of ${totalBattleCount})` : `(${(battles || []).length})`}
        </h2>
        <div style={{ border: '1px solid var(--border-dim)' }}>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 110px 70px',
            gap: '1rem',
            padding: '0.65rem 1rem',
            borderBottom: '1px solid var(--border-dim)',
            background: 'rgba(255,255,255,0.02)',
          }}>
            {['Attacker', 'Defender', 'Winner', 'Date', ''].map(h => (
              <span key={h} style={colHeaderStyle}>{h}</span>
            ))}
          </div>
          {(battles || []).length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No battles logged yet.
            </div>
          ) : (
            (battles || []).map(b => {
              const attacker = factionMap[b.attacker_faction_id];
              const defender = factionMap[b.defender_faction_id];
              const winner   = factionMap[b.winner_faction_id];
              const isDraw   = !b.winner_faction_id;
              const date     = new Date(b.created_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric',
              });
              return (
                <div key={b.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr 110px 70px',
                  gap: '1rem',
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid var(--border-dim)',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: '0.85rem', color: attacker?.colour || 'var(--text-secondary)' }}>
                    {attacker?.name ?? '—'}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: defender?.colour || 'var(--text-secondary)' }}>
                    {defender?.name ?? '—'}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.52rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: isDraw ? 'var(--text-muted)' : (winner?.colour || 'var(--text-gold)'),
                  }}>
                    {isDraw ? 'Draw' : (winner?.name ?? '—')}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{date}</span>
                  <Link href={`/c/${campaign.slug}/battle/${b.id}`} style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.52rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#e05a5a',
                    textDecoration: 'none',
                  }}>
                    View →
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
