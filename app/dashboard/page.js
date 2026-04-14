import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import CampaignCard from '@/app/components/CampaignCard';
import ArmyCard from '@/app/components/ArmyCard';

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

  // Recent battles across all campaigns (for sidebar)
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

  // Personal Battle Log — all campaign battles where this user was attacker or defender
  const { data: personalBattles } = campaignIds.length > 0
    ? await supabase
        .from('battles')
        .select('*')
        .or(`attacker_player_id.eq.${user.id},defender_player_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(20)
    : { data: [] };

  // My Armies (player-level, not campaign-scoped)
  const { data: myArmies } = await supabase
    .from('armies')
    .select('*')
    .eq('player_id', user.id)
    .order('created_at', { ascending: false });

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
          <Link href="/campaign/new">
            <button className="btn-primary">+ New Campaign</button>
          </Link>
        </div>
      </div>

      {/* Three-column layout: My Armies | My Campaigns | Recent Battles */}
      <div className="dashboard-grid">

        {/* ── My Armies ── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', margin: 0, lineHeight: 1 }}>
              My Armies
            </h2>
            <Link href="/armies/new" style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none', lineHeight: 1 }}>
              + New
            </Link>
          </div>

          {myArmies && myArmies.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {myArmies.map(army => (
                <ArmyCard key={army.id} army={army} />
              ))}
            </div>
          ) : (
            <div style={{ border: '1px solid var(--border-dim)', padding: '4rem 2rem', textAlign: 'center', background: 'rgba(255,255,255,0.01)' }}>
              <div style={{ width: '8px', height: '8px', background: 'var(--gold)', transform: 'rotate(45deg)', margin: '0 auto 1.5rem', opacity: 0.4 }} />
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                No armies yet.
              </p>
              <Link href="/armies/new">
                <button className="btn-primary">+ New Army</button>
              </Link>
            </div>
          )}
        </div>

        {/* ── My Campaigns ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', margin: 0, lineHeight: 1 }}>
              My Campaigns
            </h2>
          </div>

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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {campaigns.map(c => <CampaignCard key={c.id} campaign={c} />)}
            </div>
          )}
        </div>

        {/* ── Recent Battles ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', margin: 0, lineHeight: 1 }}>
              Recent Battles
            </h2>
          </div>
          <div style={{ border: '1px solid var(--border-dim)', padding: '1.25rem 1.5rem' }}>
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
                      <div style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border-dim)' }}>
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
        </div>
      </div>

      {/* Personal Battle Log */}
      <div style={{ borderTop: '1px solid var(--border-dim)', paddingTop: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>
            Personal Battle Log
          </h2>
        </div>

        {personalBattles && personalBattles.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {personalBattles.map(b => {
              const campaign    = campaignMap[b.campaign_id];
              const isAttacker  = b.attacker_player_id === user.id;
              const myFactionId = isAttacker ? b.attacker_faction_id : b.defender_faction_id;
              const oppFactionId = isAttacker ? b.defender_faction_id : b.attacker_faction_id;
              const myFaction   = factionMap[myFactionId];
              const oppFaction  = factionMap[oppFactionId];

              const isDraw = !b.winner_faction_id;
              const iWon   = b.winner_faction_id === myFactionId;
              const resultLabel  = isDraw ? 'Draw' : iWon ? 'Victory' : 'Defeat';
              const resultColour = isDraw
                ? 'var(--text-muted)'
                : iWon
                  ? (myFaction?.colour || 'var(--text-gold)')
                  : '#e05a5a';

              const myScore   = isAttacker ? b.attacker_score : b.defender_score;
              const oppScore  = isAttacker ? b.defender_score : b.attacker_score;
              const hasScores = b.attacker_score > 0 || b.defender_score > 0;
              const date      = new Date(b.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

              return (
                <Link key={b.id} href={`/c/${campaign?.slug}/battle/${b.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '0.9rem 0', borderBottom: '1px solid var(--border-dim)', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                    <div style={{ width: '6px', height: '6px', background: resultColour, transform: 'rotate(45deg)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <span style={{ color: myFaction?.colour || 'var(--text-secondary)' }}>{myFaction?.name ?? '?'}</span>
                        <span style={{ color: 'var(--text-muted)', margin: '0 0.4rem' }}>vs</span>
                        <span style={{ color: oppFaction?.colour || 'var(--text-secondary)' }}>{oppFaction?.name ?? '?'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.52rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: resultColour }}>
                          {resultLabel}
                        </span>
                        {hasScores && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{myScore} – {oppScore}</span>
                        )}
                        {campaign && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{campaign.name}</span>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flexShrink: 0, whiteSpace: 'nowrap' }}>{date} →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div style={{ border: '1px solid var(--border-dim)', padding: '3rem 2rem', textAlign: 'center' }}>
            <div style={{ width: '6px', height: '6px', background: 'var(--gold)', transform: 'rotate(45deg)', margin: '0 auto 1rem', opacity: 0.4 }} />
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.88rem' }}>
              No battles recorded yet — join a campaign and log your first fight.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
