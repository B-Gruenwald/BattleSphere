import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import CampaignCard from '@/app/components/CampaignCard';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const username = user.user_metadata?.username || user.email;

  const { data: memberships } = await supabase
    .from('campaign_members')
    .select('role, campaigns(id, slug, name, setting, created_at, organiser_id)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false });

  const campaigns   = memberships?.map(m => ({ ...m.campaigns, role: m.role })) ?? [];
  const campaignIds = campaigns.map(c => c.id).filter(Boolean);

  // Recent campaign battles
  const { data: recentBattles } = campaignIds.length > 0
    ? await supabase
        .from('battles')
        .select('id, campaign_id, attacker_faction_id, defender_faction_id, winner_faction_id, attacker_score, defender_score, created_at')
        .in('campaign_id', campaignIds)
        .order('created_at', { ascending: false })
        .limit(5)
    : { data: [] };

  const { data: allFactions } = campaignIds.length > 0
    ? await supabase.from('factions').select('id, name, colour, campaign_id').in('campaign_id', campaignIds)
    : { data: [] };

  // Recent standalone battles
  const { data: recentStandalone } = await supabase
    .from('standalone_battles')
    .select('id, attacker_faction, defender_faction, result, attacker_score, defender_score, battle_type, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const factionMap  = Object.fromEntries((allFactions || []).map(f => [f.id, f]));
  const campaignMap = Object.fromEntries(campaigns.map(c => [c.id, c]));

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '3rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.75rem' }}>
            Commander Overview
          </p>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '700' }}>Welcome, {username}</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/battle/new">
            <button className="btn-secondary">+ Log Battle</button>
          </Link>
          <Link href="/campaign/new">
            <button className="btn-primary">+ New Campaign</button>
          </Link>
        </div>
      </div>

      {/* Two-column layout: campaigns + campaign battles sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: campaigns.length > 0 ? '1fr 320px' : '1fr', gap: '2.5rem', alignItems: 'start', marginBottom: '3rem' }}>

        {/* Campaigns */}
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '1.5rem' }}>
            My Campaigns
          </h2>

          {campaigns.length === 0 ? (
            <div style={{ border: '1px solid var(--border-dim)', padding: '4rem 2rem', textAlign: 'center', background: 'rgba(255,255,255,0.01)' }}>
              <div style={{ width: '8px', height: '8px', background: 'var(--gold)', transform: 'rotate(45deg)', margin: '0 auto 1.5rem', opacity: 0.4 }} />
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.75rem' }}>
                No campaigns yet
              </p>
              <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.95rem', marginBottom: '2rem' }}>
                Create your first Campaign Space to get started.
              </p>
              <Link href="/campaign/new">
                <button className="btn-primary">Create Campaign</button>
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
              {campaigns.map(c => <CampaignCard key={c.id} campaign={c} />)}
            </div>
          )}
        </div>

        {/* Recent campaign battles sidebar */}
        {campaigns.length > 0 && (
          <div style={{ border: '1px solid var(--border-dim)', padding: '1.75rem' }}>
            <Link href="/battles" style={{ textDecoration: 'none' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '1.25rem' }}>
                Recent Battles
              </h2>
            </Link>
            {recentBattles && recentBattles.length > 0 ? (
              <div>
                {recentBattles.map(battle => {
                  const campaign     = campaignMap[battle.campaign_id];
                  const attacker     = factionMap[battle.attacker_faction_id];
                  const defender     = factionMap[battle.defender_faction_id];
                  const winner       = factionMap[battle.winner_faction_id];
                  const isDraw       = !battle.winner_faction_id;
                  const attackerWon  = battle.winner_faction_id === battle.attacker_faction_id;
                  const resultColour = isDraw ? 'var(--text-muted)' : (winner?.colour ?? 'var(--text-gold)');
                  const date         = new Date(battle.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                  return (
                    <Link key={battle.id} href={`/c/${campaign?.slug}/battle/${battle.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border-dim)', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
                          <div style={{ width: '5px', height: '5px', background: resultColour, transform: 'rotate(45deg)', flexShrink: 0 }} />
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {attacker?.name ?? '?'} <span style={{ color: 'var(--text-muted)' }}>vs</span> {defender?.name ?? '?'}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>{date}</span>
                        </div>
                        <div style={{ paddingLeft: '1.1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.52rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: resultColour }}>
                            {isDraw ? 'Draw' : attackerWon ? `${attacker?.name ?? '?'} Victory` : `${defender?.name ?? '?'} Victory`}
                          </span>
                          {campaign && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{campaign.name}</span>}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{ width: '6px', height: '6px', background: 'var(--gold)', transform: 'rotate(45deg)', margin: '0 auto 1rem', opacity: 0.4 }} />
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>No battles logged yet.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Personal Battle Log */}
      <div style={{ borderTop: '1px solid var(--border-dim)', paddingTop: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>
            Personal Battle Log
          </h2>
          <Link href="/battle/new" style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textDecoration: 'none' }}>
            Log battle →
          </Link>
        </div>

        {recentStandalone && recentStandalone.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {recentStandalone.map(b => {
              const isDraw      = b.result === 'draw';
              const attackerWon = b.result === 'attacker';
              const resultColour = 'var(--text-gold)';
              const date = new Date(b.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
              const hasScores = b.attacker_score > 0 || b.defender_score > 0;
              return (
                <Link key={b.id} href={`/battle/${b.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '0.9rem 0', borderBottom: '1px solid var(--border-dim)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '5px', height: '5px', background: isDraw ? 'var(--text-muted)' : resultColour, transform: 'rotate(45deg)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <span style={{ fontWeight: '600' }}>{b.attacker_faction || '?'}</span>
                        <span style={{ color: 'var(--text-muted)', margin: '0 0.4rem' }}>vs</span>
                        <span style={{ fontWeight: '600' }}>{b.defender_faction || '?'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.52rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: isDraw ? 'var(--text-muted)' : 'var(--text-gold)' }}>
                          {isDraw ? 'Draw' : attackerWon ? `${b.attacker_faction || 'Attacker'} Victory` : `${b.defender_faction || 'Defender'} Victory`}
                        </span>
                        {hasScores && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.attacker_score} – {b.defender_score}</span>}
                        {b.battle_type && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{b.battle_type}</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flexShrink: 0 }}>{date} →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div style={{ border: '1px solid var(--border-dim)', padding: '3rem 2rem', textAlign: 'center' }}>
            <div style={{ width: '6px', height: '6px', background: 'var(--gold)', transform: 'rotate(45deg)', margin: '0 auto 1rem', opacity: 0.4 }} />
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
              No personal battles recorded yet.
            </p>
            <Link href="/battle/new">
              <button className="btn-secondary">Log Your First Battle</button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
