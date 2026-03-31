import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

function RichText({ text }) {
  if (!text) return null;
  return (
    <div>
      {text.split('\n').map((line, li) => {
        const parts = [];
        const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
        let last = 0, key = 0, match;
        while ((match = regex.exec(line)) !== null) {
          if (match.index > last) parts.push(<span key={key++}>{line.slice(last, match.index)}</span>);
          if (match[0].startsWith('**')) parts.push(<strong key={key++}>{match[0].slice(2, -2)}</strong>);
          else                           parts.push(<em     key={key++}>{match[0].slice(1, -1)}</em>);
          last = match.index + match[0].length;
        }
        if (last < line.length) parts.push(<span key={key++}>{line.slice(last)}</span>);
        return <p key={li} style={{ margin: li > 0 ? '0.6rem 0 0' : '0' }}>{parts}</p>;
      })}
    </div>
  );
}

export default async function StandaloneBattleDetailPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: battle } = await supabase
    .from('standalone_battles')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!battle) notFound();

  const isDraw      = battle.result === 'draw';
  const attackerWon = battle.result === 'attacker';
  const resultLabel = isDraw ? 'Draw' : attackerWon
    ? `${battle.attacker_faction || 'Attacker'} Victory`
    : `${battle.defender_faction || 'Defender'} Victory`;
  const resultColour = isDraw ? 'var(--text-muted)' : 'var(--text-gold)';
  const hasScores    = battle.attacker_score > 0 || battle.defender_score > 0;

  const date = new Date(battle.created_at).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '860px', margin: '0 auto' }}>

      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2.5rem' }}>
        <Link href="/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>Dashboard</Link>
        <span style={{ color: 'var(--border-dim)', fontSize: '0.8rem' }}>›</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Battle Record</span>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>
            Personal Battle Log · {date}
          </p>
          {battle.battle_type && (
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'var(--text-secondary)',
              border: '1px solid var(--border-dim)', padding: '0.2rem 0.6rem',
            }}>
              {battle.battle_type}
            </span>
          )}
        </div>
        <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 2.2rem)', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          {battle.attacker_faction || 'Attacker'}{' '}
          <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>vs</span>{' '}
          {battle.defender_faction || 'Defender'}
        </h1>

        {/* Result badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
          padding: '0.5rem 1.25rem', border: `1px solid ${resultColour}`, background: `${resultColour}18`,
        }}>
          <div style={{ width: '8px', height: '8px', background: resultColour, transform: 'rotate(45deg)' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: resultColour }}>
            {resultLabel}
          </span>
          {hasScores && (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginLeft: '0.25rem' }}>
              {battle.attacker_score} – {battle.defender_score}
            </span>
          )}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border-dim)', marginBottom: '2.5rem' }} />

      {/* Player cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div style={{ border: '1px solid var(--border-dim)', padding: '1.5rem' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Attacker {attackerWon && !isDraw ? '· Victory' : ''}
          </p>
          <p style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
            {battle.attacker_faction || '—'}
          </p>
          {battle.attacker_player    && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Commanded by {battle.attacker_player}</p>}
          {battle.attacker_army_type && <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic', marginBottom: '0.3rem' }}>{battle.attacker_army_type}</p>}
          {hasScores && <p style={{ color: 'var(--text-gold)', fontSize: '1.25rem', fontWeight: '700', marginTop: '0.75rem' }}>{battle.attacker_score} pts</p>}
        </div>

        <div style={{ border: '1px solid var(--border-dim)', padding: '1.5rem' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Defender {!attackerWon && !isDraw ? '· Victory' : ''}
          </p>
          <p style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
            {battle.defender_faction || '—'}
          </p>
          {battle.defender_player    && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Commanded by {battle.defender_player}</p>}
          {battle.defender_army_type && <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic', marginBottom: '0.3rem' }}>{battle.defender_army_type}</p>}
          {hasScores && <p style={{ color: 'var(--text-gold)', fontSize: '1.25rem', fontWeight: '700', marginTop: '0.75rem' }}>{battle.defender_score} pts</p>}
        </div>
      </div>

      {/* Army Lists */}
      {(battle.attacker_army_list || battle.defender_army_list) && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '1.25rem' }}>
            Army Lists
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {battle.attacker_army_list && (
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                  {battle.attacker_faction || 'Attacker'}
                </p>
                <pre style={{
                  color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.6,
                  background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-dim)',
                  padding: '1rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  fontFamily: 'monospace', maxHeight: '320px', overflowY: 'auto', margin: 0,
                }}>
                  {battle.attacker_army_list}
                </pre>
              </div>
            )}
            {battle.defender_army_list && (
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                  {battle.defender_faction || 'Defender'}
                </p>
                <pre style={{
                  color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.6,
                  background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-dim)',
                  padding: '1rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  fontFamily: 'monospace', maxHeight: '320px', overflowY: 'auto', margin: 0,
                }}>
                  {battle.defender_army_list}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Per-player Chronicles */}
      {(battle.attacker_narrative || battle.defender_narrative) && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '1.25rem' }}>
            Battle Chronicles
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {battle.attacker_narrative && (
              <div style={{ border: '1px solid var(--border-dim)', padding: '1.75rem' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  {battle.attacker_player ? `${battle.attacker_player}'s Account` : `${battle.attacker_faction || 'Attacker'}'s Account`}
                </p>
                <div style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontStyle: 'italic', fontSize: '0.95rem' }}>
                  <RichText text={battle.attacker_narrative} />
                </div>
              </div>
            )}
            {battle.defender_narrative && (
              <div style={{ border: '1px solid var(--border-dim)', padding: '1.75rem' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  {battle.defender_player ? `${battle.defender_player}'s Account` : `${battle.defender_faction || 'Defender'}'s Account`}
                </p>
                <div style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontStyle: 'italic', fontSize: '0.95rem' }}>
                  <RichText text={battle.defender_narrative} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* General Notes */}
      {battle.notes && (
        <div style={{ border: '1px solid var(--border-dim)', padding: '1.75rem', marginBottom: '2.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '1rem' }}>
            Notes
          </h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.95rem' }}>{battle.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link href="/dashboard"><button className="btn-secondary">← Dashboard</button></Link>
        <Link href={`/battle/${id}/edit`}><button className="btn-secondary">Edit Battle</button></Link>
      </div>
    </div>
  );
}
