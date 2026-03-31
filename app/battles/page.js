import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function AllBattlesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // All campaigns the user belongs to
  const { data: memberships } = await supabase
    .from('campaign_members')
    .select('campaigns(id, slug, name)')
    .eq('user_id', user.id);

  const campaigns = (memberships || []).map(m => m.campaigns).filter(Boolean);
  const campaignIds = campaigns.map(c => c.id);
  const campaignMap = Object.fromEntries(campaigns.map(c => [c.id, c]));

  // All battles across all those campaigns
  const { data: battles } = campaignIds.length > 0
    ? await supabase
        .from('battles')
        .select('*')
        .in('campaign_id', campaignIds)
        .order('created_at', { ascending: false })
    : { data: [] };

  // All factions across those campaigns
  const { data: allFactions } = campaignIds.length > 0
    ? await supabase
        .from('factions')
        .select('id, name, colour, campaign_id')
        .in('campaign_id', campaignIds)
    : { data: [] };

  // All territories across those campaigns
  const { data: allTerritories } = campaignIds.length > 0
    ? await supabase
        .from('territories')
        .select('id, name, campaign_id')
        .in('campaign_id', campaignIds)
    : { data: [] };

  const factionMap   = Object.fromEntries((allFactions   || []).map(f => [f.id, f]));
  const territoryMap = Object.fromEntries((allTerritories || []).map(t => [t.id, t]));

  // Group battles by campaign for section headers
  const battlesByCampaign = campaigns.map(c => ({
    campaign: c,
    battles: (battles || []).filter(b => b.campaign_id === c.id),
  })).filter(g => g.battles.length > 0);

  const totalBattles = battles?.length ?? 0;

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '900px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '3rem' }}>
        <Link href="/dashboard" style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', textDecoration: 'none' }}>
          ← Dashboard
        </Link>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '1rem' }}>
          Battle History
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          {totalBattles} {totalBattles === 1 ? 'battle' : 'battles'} across {campaigns.length} {campaigns.length === 1 ? 'campaign' : 'campaigns'}
        </p>
      </div>

      {totalBattles === 0 ? (
        <div style={{ border: '1px solid var(--border-dim)', padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ width: '8px', height: '8px', background: 'var(--gold)', transform: 'rotate(45deg)', margin: '0 auto 1.5rem', opacity: 0.4 }} />
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.75rem' }}>
            No battles yet
          </p>
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.95rem' }}>
            Head to a campaign to log your first battle.
          </p>
        </div>
      ) : (
        battlesByCampaign.map(({ campaign, battles: cBattles }) => (
          <div key={campaign.id} style={{ marginBottom: '3.5rem' }}>
            {/* Campaign section header */}
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-dim)' }}>
              <Link href={`/c/${campaign.slug}`} style={{ textDecoration: 'none' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>
                  {campaign.name}
                </span>
              </Link>
              <Link href={`/c/${campaign.slug}/battles`} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
                {cBattles.length} {cBattles.length === 1 ? 'battle' : 'battles'} →
              </Link>
            </div>

            {/* Battles in this campaign */}
            {cBattles.map(battle => {
              const attacker  = factionMap[battle.attacker_faction_id];
              const defender  = factionMap[battle.defender_faction_id];
              const winner    = factionMap[battle.winner_faction_id];
              const territory = battle.territory_id ? territoryMap[battle.territory_id] : null;
              const isDraw    = !battle.winner_faction_id;
              const attackerWon = battle.winner_faction_id === battle.attacker_faction_id;
              const resultLabel = isDraw ? 'Draw'
                : attackerWon ? `${attacker?.name ?? '?'} Victory`
                : `${defender?.name ?? '?'} Victory`;
              const resultColour = isDraw ? 'var(--text-muted)' : (winner?.colour ?? 'var(--text-gold)');
              const date = new Date(battle.created_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric',
              });

              return (
                <Link key={battle.id} href={`/c/${campaign.slug}/battle/${battle.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    padding: '1rem 0',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    cursor: 'pointer',
                  }}>
                    <div style={{ width: '7px', height: '7px', background: resultColour, transform: 'rotate(45deg)', flexShrink: 0 }} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.15rem' }}>
                        <span style={{ fontWeight: '600' }}>{attacker?.name ?? '?'}</span>
                        <span style={{ color: 'var(--text-muted)', margin: '0 0.4rem' }}>vs</span>
                        <span style={{ fontWeight: '600' }}>{defender?.name ?? '?'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.52rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: resultColour }}>
                          {resultLabel}
                        </span>
                        {(battle.attacker_score != null && battle.defender_score != null) && (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {battle.attacker_score} – {battle.defender_score}
                          </span>
                        )}
                        {territory && (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            {territory.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {date} →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
