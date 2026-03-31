import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function BattleHistoryPage({ params }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!campaign) notFound();

  const { data: factions } = await supabase
    .from('factions')
    .select('*')
    .eq('campaign_id', campaign.id);

  const { data: territories } = await supabase
    .from('territories')
    .select('id, name')
    .eq('campaign_id', campaign.id);

  const { data: battles } = await supabase
    .from('battles')
    .select('*')
    .eq('campaign_id', campaign.id)
    .order('created_at', { ascending: false });

  const factionMap = Object.fromEntries((factions || []).map(f => [f.id, f]));
  const territoryMap = Object.fromEntries((territories || []).map(t => [t.id, t]));

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '900px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '3rem' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.75rem' }}>
          {campaign.name}
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Battle History
          </h1>
          <Link href={`/c/${slug}/battle/new`}>
            <button className="btn-primary">+ Log Battle</button>
          </Link>
        </div>
      </div>

      {/* Battles list */}
      {battles && battles.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {battles.map((battle, i) => {
            const attacker = factionMap[battle.attacker_faction_id];
            const defender = factionMap[battle.defender_faction_id];
            const winner   = factionMap[battle.winner_faction_id];
            const territory = battle.territory_id ? territoryMap[battle.territory_id] : null;
            const isDraw   = !battle.winner_faction_id;
            const attackerWon = battle.winner_faction_id === battle.attacker_faction_id;
            const resultLabel = isDraw ? 'Draw'
              : attackerWon ? `${attacker?.name ?? '?'} Victory`
              : `${defender?.name ?? '?'} Victory`;
            const resultColour = isDraw ? 'var(--text-muted)' : (winner?.colour ?? 'var(--text-gold)');
            const date = new Date(battle.created_at).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric',
            });

            return (
              <Link key={battle.id} href={`/c/${slug}/battle/${battle.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '1.25rem 0',
                  borderBottom: '1px solid var(--border-dim)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  cursor: 'pointer',
                }}>
                  {/* Result diamond */}
                  <div style={{
                    width: '8px',
                    height: '8px',
                    background: resultColour,
                    transform: 'rotate(45deg)',
                    flexShrink: 0,
                  }} />

                  {/* Match info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                      <span style={{ fontWeight: '600' }}>{attacker?.name ?? '?'}</span>
                      <span style={{ color: 'var(--text-muted)', margin: '0 0.5rem' }}>vs</span>
                      <span style={{ fontWeight: '600' }}>{defender?.name ?? '?'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '0.55rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: resultColour,
                      }}>
                        {resultLabel}
                      </span>
                      {(battle.attacker_score != null && battle.defender_score != null) && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {battle.attacker_score} – {battle.defender_score}
                        </span>
                      )}
                      {territory && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          {territory.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date + arrow */}
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {date} →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border-dim)', padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ width: '8px', height: '8px', background: 'var(--gold)', transform: 'rotate(45deg)', margin: '0 auto 1.5rem', opacity: 0.4 }} />
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.75rem' }}>
            No battles yet
          </p>
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.95rem', marginBottom: '2rem' }}>
            The first battle has yet to be recorded.
          </p>
          <Link href={`/c/${slug}/battle/new`}>
            <button className="btn-primary">Log First Battle</button>
          </Link>
        </div>
      )}
    </div>
  );
}
