import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function FreeBattleDetailPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: battle } = await supabase
    .from('battles')
    .select('*')
    .eq('id', id)
    .is('campaign_id', null)
    .single();

  if (!battle) notFound();

  // Fetch player profiles
  const playerIds = [battle.attacker_player_id, battle.defender_player_id, battle.winner_player_id].filter(Boolean);
  const { data: profiles } = playerIds.length > 0
    ? await supabase.from('profiles').select('id, username, profile_public').in('id', playerIds)
    : { data: [] };
  const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

  const attackerProfile = profileMap[battle.attacker_player_id] ?? null;
  const defenderProfile = profileMap[battle.defender_player_id] ?? null;

  const isDraw   = !battle.winner_player_id;
  const p1Won    = battle.winner_player_id === battle.attacker_player_id;
  const resultLabel =
    isDraw  ? 'Draw'
    : p1Won ? `${attackerProfile?.username ?? 'Player 1'} wins`
            : `${defenderProfile?.username ?? 'Player 2'} wins`;
  const resultColour = isDraw ? 'var(--text-muted)' : p1Won ? '#6abf6a' : '#e05a5a';

  const hasScores = battle.attacker_score > 0 || battle.defender_score > 0;

  // Fetch armies
  const armyIds = [battle.army_id_p1, battle.army_id_p2].filter(Boolean);
  const { data: armyRows } = armyIds.length > 0
    ? await supabase.from('armies').select('id, name, faction_name').in('id', armyIds)
    : { data: [] };
  const armyMap = Object.fromEntries((armyRows || []).map(a => [a.id, a]));
  const p1Army  = armyMap[battle.army_id_p1] ?? null;
  const p2Army  = armyMap[battle.army_id_p2] ?? null;

  const date = new Date(battle.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const canEdit = user.id === battle.logged_by;

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '900px', margin: '0 auto' }}>

      {/* Breadcrumb */}
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        <Link href="/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Dashboard</Link>
        {' '}›{' '}Personal Battle Log
      </p>

      {/* Title */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 2.2rem)', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          {battle.headline || `${attackerProfile?.username ?? 'Player 1'} vs ${defenderProfile?.username ?? 'Player 2'}`}
        </h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: resultColour }}>
            {resultLabel}
          </span>
          {hasScores && (
            <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              {battle.attacker_score} – {battle.defender_score}
            </span>
          )}
          {battle.battle_type && (
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              {battle.battle_type}
            </span>
          )}
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{date}</span>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border-dim)', marginBottom: '2.5rem' }} />

      {/* Player cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>

        {/* Attacker */}
        <div style={{ border: '1px solid var(--border-dim)', padding: '1.5rem' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Player 1 {p1Won && !isDraw ? '· Victory' : ''}
          </p>
          {attackerProfile ? (
            <Link href={`/players/${encodeURIComponent(attackerProfile.username)}`} style={{ fontSize: '1rem', fontWeight: '700', color: p1Won && !isDraw ? '#6abf6a' : 'var(--text-primary)', textDecoration: 'none', display: 'block', marginBottom: '0.5rem' }}>
              {attackerProfile.username}
            </Link>
          ) : (
            <p style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Unknown Player</p>
          )}
          {p1Army && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
              Army:{' '}
              <Link href={`/armies/${p1Army.id}`} style={{ color: 'var(--text-gold)', textDecoration: 'none' }}>
                {p1Army.name}
              </Link>
            </p>
          )}
          {battle.attacker_army_type && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic', marginBottom: '0.5rem' }}>
              {battle.attacker_army_type}
            </p>
          )}
          {hasScores && (
            <p style={{ color: p1Won && !isDraw ? '#6abf6a' : 'var(--text-gold)', fontSize: '1.25rem', fontWeight: '700', marginTop: '0.75rem' }}>
              {battle.attacker_score} pts
            </p>
          )}
        </div>

        {/* Defender */}
        <div style={{ border: '1px solid var(--border-dim)', padding: '1.5rem' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Player 2 {!p1Won && !isDraw ? '· Victory' : ''}
          </p>
          {defenderProfile ? (
            <Link href={`/players/${encodeURIComponent(defenderProfile.username)}`} style={{ fontSize: '1rem', fontWeight: '700', color: !p1Won && !isDraw ? '#e05a5a' : 'var(--text-primary)', textDecoration: 'none', display: 'block', marginBottom: '0.5rem' }}>
              {defenderProfile.username}
            </Link>
          ) : (
            <p style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Unknown Player</p>
          )}
          {p2Army && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
              Army:{' '}
              <Link href={`/armies/${p2Army.id}`} style={{ color: 'var(--text-gold)', textDecoration: 'none' }}>
                {p2Army.name}
              </Link>
            </p>
          )}
          {battle.defender_army_type && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic', marginBottom: '0.5rem' }}>
              {battle.defender_army_type}
            </p>
          )}
          {hasScores && (
            <p style={{ color: !p1Won && !isDraw ? '#e05a5a' : 'var(--text-gold)', fontSize: '1.25rem', fontWeight: '700', marginTop: '0.75rem' }}>
              {battle.defender_score} pts
            </p>
          )}
        </div>
      </div>

      {/* Scenario */}
      {battle.scenario && (
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Scenario</p>
          <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{battle.scenario}</p>
        </div>
      )}

      {/* Notes */}
      {battle.notes && (
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Notes</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{battle.notes}</p>
        </div>
      )}

      {/* Narratives */}
      {(battle.attacker_narrative || battle.defender_narrative) && (
        <div style={{ marginBottom: '2rem' }}>
          {battle.attacker_narrative && (
            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                {attackerProfile?.username ?? 'Player 1'}'s Account
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{battle.attacker_narrative}</p>
            </div>
          )}
          {battle.defender_narrative && (
            <div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                {defenderProfile?.username ?? 'Player 2'}'s Account
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{battle.defender_narrative}</p>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <Link href="/dashboard">
          <button className="btn-secondary">← Dashboard</button>
        </Link>
      </div>
    </div>
  );
}
