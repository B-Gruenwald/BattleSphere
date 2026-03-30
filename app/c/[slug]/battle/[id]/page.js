import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function BattleDetailPage({ params }) {
  const { slug, id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!campaign) notFound();

  const { data: battle } = await supabase
    .from('battles')
    .select('*')
    .eq('id', id)
    .eq('campaign_id', campaign.id)
    .single();

  if (!battle) notFound();

  // Fetch factions
  const { data: factions } = await supabase
    .from('factions')
    .select('*')
    .eq('campaign_id', campaign.id);

  // Fetch territory (if any)
  let territory = null;
  if (battle.territory_id) {
    const { data } = await supabase
      .from('territories')
      .select('id, name, type')
      .eq('id', battle.territory_id)
      .single();
    territory = data;
  }

  // Fetch player profiles (attacker + defender)
  const playerIds = [battle.attacker_player_id, battle.defender_player_id].filter(Boolean);
  const { data: profiles } = playerIds.length > 0
    ? await supabase.from('profiles').select('id, username').in('id', playerIds)
    : { data: [] };

  const profileMap   = Object.fromEntries((profiles || []).map(p => [p.id, p]));
  const factionMap   = Object.fromEntries((factions || []).map(f => [f.id, f]));

  const attackerFaction = factionMap[battle.attacker_faction_id];
  const defenderFaction = factionMap[battle.defender_faction_id];
  const winnerFaction   = factionMap[battle.winner_faction_id];
  const attackerPlayer  = profileMap[battle.attacker_player_id];
  const defenderPlayer  = profileMap[battle.defender_player_id];

  const isDraw       = !battle.winner_faction_id;
  const attackerWon  = battle.winner_faction_id === battle.attacker_faction_id;
  const resultLabel  = isDraw ? 'Draw' : attackerWon ? `${attackerFaction?.name ?? '?'} Victory` : `${defenderFaction?.name ?? '?'} Victory`;
  const resultColour = isDraw ? 'var(--text-muted)' : (winnerFaction?.colour ?? 'var(--text-gold)');
  const hasScores    = battle.attacker_score > 0 || battle.defender_score > 0;

  const date = new Date(battle.created_at).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '820px', margin: '0 auto' }}>

      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
        <Link href={`/c/${slug}`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>
          {campaign.name}
        </Link>
        <span style={{ color: 'var(--border-dim)', fontSize: '0.8rem' }}>›</span>
        {territory ? (
          <>
            <Link href={`/c/${slug}/territory/${territory.id}`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>
              {territory.name}
            </Link>
            <span style={{ color: 'var(--border-dim)', fontSize: '0.8rem' }}>›</span>
          </>
        ) : null}
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Battle Record</span>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.5rem' }}>
          Battle Record · {date}
        </p>
        <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 2.2rem)', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          {attackerFaction?.name ?? '?'} <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>vs</span> {defenderFaction?.name ?? '?'}
        </h1>

        {/* Result badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.5rem 1.25rem',
          border: `1px solid ${resultColour}`,
          background: `${resultColour}18`,
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

      {/* Detail grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>

        {/* Attacker */}
        <div style={{ border: '1px solid var(--border-dim)', padding: '1.5rem' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Attacker {attackerWon && !isDraw ? '· Victory' : ''}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ width: '10px', height: '10px', background: attackerFaction?.colour || 'var(--border-dim)', transform: 'rotate(45deg)', flexShrink: 0 }} />
            <span style={{ fontSize: '1rem', fontWeight: '700', color: attackerWon && !isDraw ? attackerFaction?.colour : 'var(--text-primary)' }}>
              {attackerFaction?.name ?? 'Unknown Faction'}
            </span>
          </div>
          {attackerPlayer && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Commanded by {attackerPlayer.username}
            </p>
          )}
          {hasScores && (
            <p style={{ color: 'var(--text-gold)', fontSize: '1.25rem', fontWeight: '700', marginTop: '0.75rem' }}>
              {battle.attacker_score} pts
            </p>
          )}
        </div>

        {/* Defender */}
        <div style={{ border: '1px solid var(--border-dim)', padding: '1.5rem' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Defender {!attackerWon && !isDraw ? '· Victory' : ''}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ width: '10px', height: '10px', background: defenderFaction?.colour || 'var(--border-dim)', transform: 'rotate(45deg)', flexShrink: 0 }} />
            <span style={{ fontSize: '1rem', fontWeight: '700', color: !attackerWon && !isDraw ? defenderFaction?.colour : 'var(--text-primary)' }}>
              {defenderFaction?.name ?? 'Unknown Faction'}
            </span>
          </div>
          {defenderPlayer && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Commanded by {defenderPlayer.username}
            </p>
          )}
          {hasScores && (
            <p style={{ color: 'var(--text-gold)', fontSize: '1.25rem', fontWeight: '700', marginTop: '0.75rem' }}>
              {battle.defender_score} pts
            </p>
          )}
        </div>

        {/* Location */}
        {territory && (
          <div style={{ border: '1px solid var(--border-dim)', padding: '1.5rem' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Theatre of War
            </p>
            <Link href={`/c/${slug}/territory/${territory.id}`} style={{ textDecoration: 'none' }}>
              <p style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>{territory.name}</p>
              {territory.type && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{territory.type}</p>
              )}
              <p style={{ color: 'var(--text-gold)', fontSize: '0.8rem', marginTop: '0.5rem' }}>View territory →</p>
            </Link>
          </div>
        )}
      </div>

      {/* Chronicle */}
      {battle.narrative && (
        <div style={{ border: '1px solid var(--border-dim)', padding: '2rem', marginBottom: '2.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '1rem' }}>
            Battle Chronicle
          </h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontStyle: 'italic', fontSize: '0.95rem' }}>
            {battle.narrative}
          </p>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link href={`/c/${slug}`}>
          <button className="btn-secondary">← Campaign Dashboard</button>
        </Link>
        {territory && (
          <Link href={`/c/${slug}/territory/${territory.id}`}>
            <button className="btn-secondary">View Territory</button>
          </Link>
        )}
      </div>
    </div>
  );
}
