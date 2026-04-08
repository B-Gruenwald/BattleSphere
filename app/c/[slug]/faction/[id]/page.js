import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { calcPlayerXP, getXPRank } from '@/app/lib/xp';

export default async function FactionDetailPage({ params }) {
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

  const { data: faction } = await supabase
    .from('factions')
    .select('*')
    .eq('id', id)
    .eq('campaign_id', campaign.id)
    .single();

  if (!faction) notFound();

  // All factions (for opponent name lookups)
  const { data: allFactions } = await supabase
    .from('factions')
    .select('*')
    .eq('campaign_id', campaign.id);

  // Battles involving this faction
  const { data: battles } = await supabase
    .from('battles')
    .select('*')
    .eq('campaign_id', campaign.id)
    .or(`attacker_faction_id.eq.${id},defender_faction_id.eq.${id}`)
    .order('created_at', { ascending: false });

  // Controlled territories
  const { data: controlled } = await supabase
    .from('territories')
    .select('*')
    .eq('campaign_id', campaign.id)
    .eq('controlling_faction_id', id)
    .order('depth')
    .order('name');

  // Players who fight for this faction
  const { data: assignedMembers } = await supabase
    .from('campaign_members')
    .select('user_id')
    .eq('campaign_id', campaign.id)
    .eq('faction_id', id);

  const memberIds = (assignedMembers || []).map(m => m.user_id);
  const { data: playerProfiles } = memberIds.length > 0
    ? await supabase.from('profiles').select('id, username').in('id', memberIds)
    : { data: [] };

  // Achievements for this faction
  const { data: achievements } = await supabase
    .from('achievements')
    .select('*')
    .eq('campaign_id', campaign.id)
    .eq('awarded_to_type', 'faction')
    .eq('awarded_to_faction_id', id)
    .order('created_at', { ascending: false });

  // All campaign battles — needed for complete player XP (players may have fought in other factions)
  const { data: allCampaignBattles } = await supabase
    .from('battles')
    .select('attacker_player_id, defender_player_id, attacker_faction_id, defender_faction_id, winner_faction_id, territory_id')
    .eq('campaign_id', campaign.id);

  const factionMap = Object.fromEntries((allFactions || []).map(f => [f.id, f]));

  // Compute record
  const wins   = (battles || []).filter(b => b.winner_faction_id === id).length;
  const draws  = (battles || []).filter(b => b.winner_faction_id === null).length;
  const losses = (battles || []).length - wins - draws;

  const isOrganiser = campaign.organiser_id === user.id;

  // Fetch player profiles for battle display
  const battlePlayerIds = [...new Set(
    (battles || []).flatMap(b => [b.attacker_player_id, b.defender_player_id]).filter(Boolean)
  )];
  const { data: battleProfiles } = battlePlayerIds.length > 0
    ? await supabase.from('profiles').select('id, username').in('id', battlePlayerIds)
    : { data: [] };
  const profileMap = Object.fromEntries((battleProfiles || []).map(p => [p.id, p]));

  const DEPTH_LABELS = { 1: 'Region', 2: 'Sector', 3: 'Location' };

  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '900px', margin: '0 auto' }}>

      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
        <Link href={`/c/${slug}`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>{campaign.name}</Link>
        <span style={{ color: 'var(--border-dim)', fontSize: '0.8rem' }}>›</span>
        <Link href={`/c/${slug}/factions`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>Factions</Link>
        <span style={{ color: 'var(--border-dim)', fontSize: '0.8rem' }}>›</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{faction.name}</span>
      </nav>

      {/* Faction header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
          <div style={{ width: '18px', height: '18px', background: faction.colour, transform: 'rotate(45deg)', flexShrink: 0 }} />
          <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.6rem)', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {faction.name}
          </h1>
        </div>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>
          {campaign.name} · {campaign.setting}
        </p>
      </div>

      {/* Record strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', borderTop: '1px solid var(--border-dim)', borderBottom: '1px solid var(--border-dim)', marginBottom: '2.5rem' }}>
        {[
          { label: 'Victories', value: wins,   colour: faction.colour },
          { label: 'Draws',     value: draws,  colour: 'var(--text-secondary)' },
          { label: 'Defeats',   value: losses, colour: losses > 0 ? '#e05a5a' : 'var(--text-secondary)' },
          { label: 'Battles',   value: (battles || []).length, colour: 'var(--text-primary)' },
          { label: 'Territories', value: (controlled || []).length, colour: 'var(--text-gold)' },
        ].map((stat, i, arr) => (
          <div key={stat.label} style={{ padding: '1.25rem 0.75rem', textAlign: 'center', borderRight: i < arr.length - 1 ? '1px solid var(--border-dim)' : 'none' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: '700', color: stat.colour, marginBottom: '0.25rem' }}>{stat.value}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Achievements */}
      {achievements && achievements.length > 0 && (
        <div style={{ border: '1px solid rgba(183,140,64,0.25)', padding: '1.75rem', marginBottom: '1.5rem', background: 'rgba(183,140,64,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>
              Achievements
            </h2>
            <Link href={`/c/${slug}/achievements`} style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textDecoration: 'none' }}>
              Hall of Honours →
            </Link>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            {achievements.map(a => (
              <div
                key={a.id}
                title={a.description || a.title}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.4rem 0.8rem',
                  background: 'var(--bg-raised)',
                  border: '1px solid rgba(183,140,64,0.3)',
                }}
              >
                <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{a.icon}</span>
                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>{a.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Award achievement shortcut for organiser */}
      {isOrganiser && (
        <div style={{ marginBottom: '1.5rem', textAlign: 'right' }}>
          <Link href={`/c/${slug}/achievements/new`} style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textDecoration: 'none' }}>
            + Award achievement to {faction.name} →
          </Link>
        </div>
      )}

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>

        {/* Controlled territories */}
        <div style={{ border: '1px solid var(--border-dim)', padding: '1.75rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '1.25rem' }}>
            Controlled Territories
          </h2>
          {controlled && controlled.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {controlled.map(t => (
                <Link key={t.id} href={`/c/${slug}/territory/${t.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 0' }}>
                    <div style={{ width: '7px', height: '7px', background: faction.colour, transform: 'rotate(45deg)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem', flex: 1 }}>{t.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{DEPTH_LABELS[t.depth] || ''}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>No territories held.</p>
          )}
        </div>

        {/* Players */}
        <div style={{ border: '1px solid var(--border-dim)', padding: '1.75rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '1.25rem' }}>
            Players
          </h2>
          {playerProfiles && playerProfiles.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {playerProfiles.map(p => {
                const pXP   = calcPlayerXP(allCampaignBattles, p.id);
                const pRank = getXPRank(pXP);
                return (
                  <Link key={p.id} href={`/c/${slug}/player/${p.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '28px', height: '28px', background: 'var(--surface-2)', border: `1px solid ${faction.colour}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: faction.colour, fontWeight: '700', flexShrink: 0 }}>
                        {p.username.slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{p.username}</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.48rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                          {pRank}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: pXP > 0 ? 'var(--text-gold)' : 'var(--text-muted)' }}>
                          {pXP}<span style={{ fontSize: '0.6rem', fontWeight: '400', marginLeft: '0.15rem', opacity: 0.7 }}>xp</span>
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>No players assigned yet.</p>
          )}
        </div>
      </div>

      {/* Battle history */}
      <div style={{ border: '1px solid var(--border-dim)', padding: '1.75rem', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>
            Battle History
          </h2>
          <Link href={`/c/${slug}/battle/new`} style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textDecoration: 'none' }}>
            Log battle →
          </Link>
        </div>
        {battles && battles.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {battles.map(battle => {
              const isAttacker    = battle.attacker_faction_id === id;
              const opponent      = factionMap[isAttacker ? battle.defender_faction_id : battle.attacker_faction_id];
              const won           = battle.winner_faction_id === id;
              const draw          = battle.winner_faction_id === null;
              const resultLabel   = draw ? 'Draw' : won ? 'Victory' : 'Defeat';
              const resultColour  = draw ? 'var(--text-muted)' : won ? faction.colour : '#e05a5a';
              const myScore       = isAttacker ? battle.attacker_score : battle.defender_score;
              const theirScore    = isAttacker ? battle.defender_score : battle.attacker_score;
              const hasScores     = battle.attacker_score > 0 || battle.defender_score > 0;
              const myPlayer      = profileMap[isAttacker ? battle.attacker_player_id : battle.defender_player_id];
              const date          = new Date(battle.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

              return (
                <Link key={battle.id} href={`/c/${slug}/battle/${battle.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 0', borderBottom: '1px solid var(--border-dim)', cursor: 'pointer' }}>
                    <div style={{ width: '6px', height: '6px', background: resultColour, transform: 'rotate(45deg)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        vs <strong style={{ color: opponent?.colour || 'var(--text-primary)' }}>{opponent?.name ?? 'Unknown'}</strong>
                        {myPlayer && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}> · {myPlayer.username}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.2rem', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: resultColour }}>
                          {resultLabel}
                        </span>
                        {hasScores && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{myScore}–{theirScore}</span>
                        )}
                        {battle.territory_id && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>at territory</span>
                        )}
                      </div>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', flexShrink: 0 }}>{date} →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ width: '6px', height: '6px', background: 'var(--gold)', transform: 'rotate(45deg)', margin: '0 auto 1rem', opacity: 0.4 }} />
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>No battles recorded for this faction yet.</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link href={`/c/${slug}/factions`}>
          <button className="btn-secondary">← All Factions</button>
        </Link>
        <Link href={`/c/${slug}/battle/new`}>
          <button className="btn-primary">Log a Battle</button>
        </Link>
      </div>
    </div>
  );
}
