import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import TerritoryChildList from '@/app/components/TerritoryChildList';
import InfluenceOverrideForm from '@/app/components/InfluenceOverrideForm';
import TerritoryImageSection from '@/app/components/TerritoryImageSection';

export default async function TerritoryPage({ params }) {
  const { slug, id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  // Public visitors may view territory detail pages (no redirect)

  // Fetch campaign
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!campaign) notFound();

  // Fetch this territory
  const { data: territory } = await supabase
    .from('territories')
    .select('*')
    .eq('id', id)
    .eq('campaign_id', campaign.id)
    .single();

  if (!territory) notFound();

  // Fetch factions for colour lookup
  const { data: factions } = await supabase
    .from('factions')
    .select('*')
    .eq('campaign_id', campaign.id);

  // Fetch parent territory (if this is a sub-territory)
  let parent = null;
  if (territory.parent_id) {
    const { data } = await supabase
      .from('territories')
      .select('id, name, type')
      .eq('id', territory.parent_id)
      .single();
    parent = data;
  }

  // Fetch child territories (sub-territories of this one)
  const { data: children } = await supabase
    .from('territories')
    .select('*')
    .eq('parent_id', territory.id)
    .order('created_at');

  // Fetch battles fought at this territory (last 8)
  const { data: battles } = await supabase
    .from('battles')
    .select('id, attacker_faction_id, defender_faction_id, winner_faction_id, attacker_score, defender_score, narrative, created_at')
    .eq('territory_id', territory.id)
    .order('created_at', { ascending: false })
    .limit(8);

  // Fetch influence data for this territory
  const { data: influence } = await supabase
    .from('territory_influence')
    .select('*')
    .eq('territory_id', territory.id);

  // Fetch influence for child territories (used for 0.5× aggregation on top-level pages)
  const childIds = (children || []).map(c => c.id);
  const { data: childInfluence } = childIds.length > 0
    ? await supabase.from('territory_influence').select('*').in('territory_id', childIds)
    : { data: [] };

  const factionMap = Object.fromEntries((factions || []).map(f => [f.id, f]));
  const controllingFaction = territory.controlling_faction_id
    ? factionMap[territory.controlling_faction_id]
    : null;

  let isOrganiser = false;
  if (user) {
    const { data: myMembership } = await supabase
      .from('campaign_members')
      .select('role')
      .eq('campaign_id', campaign.id)
      .eq('user_id', user.id)
      .single();
    isOrganiser = campaign.organiser_id === user.id
      || ['organiser', 'admin', 'Organiser'].includes(myMembership?.role);
  }

  const DEPTH_LABELS = { 1: 'Region', 2: 'Sector', 3: 'Location' };
  const depthLabel = DEPTH_LABELS[territory.depth] || 'Territory';

  // Status colour for controlling faction
  const statusColour = controllingFaction?.colour || 'var(--border-dim)';
  const statusLabel = controllingFaction?.name || 'Contested';

  // Influence helpers — for top-level territories, add child contributions at 0.5×
  const isTopLevel = territory.depth === 1;
  const hasChildInfluence = isTopLevel && (childInfluence || []).some(i => i.influence_points > 0);

  const getInfluence = (factionId) => {
    const direct = (influence || []).find(i => i.faction_id === factionId)?.influence_points ?? 0;
    if (!isTopLevel) return direct;
    const fromChildren = (childInfluence || [])
      .filter(i => i.faction_id === factionId)
      .reduce((sum, i) => sum + i.influence_points * 0.5, 0);
    return direct + fromChildren;
  };
  const totalInfluence = (factions || []).reduce((sum, f) => sum + getInfluence(f.id), 0);

  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '900px', margin: '0 auto' }}>

      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
        <Link href={`/c/${slug}`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem', letterSpacing: '0.06em' }}>
          {campaign.name}
        </Link>
        <span style={{ color: 'var(--border-dim)', fontSize: '0.8rem' }}>›</span>
        <Link href={`/c/${slug}/map`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem', letterSpacing: '0.06em' }}>
          Map
        </Link>
        {parent && (
          <>
            <span style={{ color: 'var(--border-dim)', fontSize: '0.8rem' }}>›</span>
            <Link href={`/c/${slug}/territory/${parent.id}`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem', letterSpacing: '0.06em' }}>
              {parent.name}
            </Link>
          </>
        )}
        <span style={{ color: 'var(--border-dim)', fontSize: '0.8rem' }}>›</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', letterSpacing: '0.06em' }}>{territory.name}</span>
      </nav>

      {/* Territory header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.6rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--text-gold)',
          marginBottom: '0.5rem',
        }}>
          {depthLabel} · {territory.type || 'Territory'}
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <h1 style={{
              fontSize: 'clamp(1.6rem, 4vw, 2.6rem)',
              fontWeight: '900',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              {territory.name}
            </h1>
            {user && (
              <Link href={`/c/${slug}/battle/new?territory=${territory.id}`}>
                <button className="btn-primary" style={{ padding: '0.35rem 0.85rem', fontSize: '0.55rem' }}>
                  + Log a Battle Here
                </button>
              </Link>
            )}
          </div>

          {/* Control status badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.5rem 1rem',
            border: `1px solid ${statusColour}`,
            background: `${statusColour}18`,
            flexShrink: 0,
          }}>
            <div style={{ width: '8px', height: '8px', background: statusColour, transform: 'rotate(45deg)' }} />
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.6rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: controllingFaction ? statusColour : 'var(--text-muted)',
            }}>
              {statusLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Territory description */}
      {territory.description && (
        <p style={{
          fontSize: '0.95rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.7,
          fontStyle: 'italic',
          marginBottom: '2.5rem',
        }}>
          {territory.description}
        </p>
      )}

      {/* Territory image (visible to all) / upload control (organisers only) */}
      <TerritoryImageSection
        campaignId={campaign.id}
        territoryId={territory.id}
        initialImageUrl={territory.image_url || null}
        initialFocalPoint={territory.image_focal_point || 'center'}
        isOrganiser={isOrganiser}
      />

      {/* Divider line */}
      <div style={{ borderTop: '1px solid var(--border-dim)', marginBottom: '2.5rem' }} />

      {/* ── Influence panel ── */}
      <div style={{ border: '1px solid var(--border-dim)', padding: '1.75rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.65rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--text-gold)',
              marginBottom: '0.3rem',
            }}>
              Territorial Influence
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Earned through battles fought here. Win: +3 · Draw: +1 · Loss: no change
              {hasChildInfluence && (
                <span> · Sub-territory influence counts at ×0.5</span>
              )}
            </p>
          </div>
          {totalInfluence > 0 && (
            <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {totalInfluence} total
            </span>
          )}
        </div>

        {/* Stacked influence bar (read-only visual for all users) */}
        {totalInfluence > 0 && (
          <div style={{ height: '8px', display: 'flex', borderRadius: '2px', overflow: 'hidden', marginBottom: '1.5rem', gap: '1px' }}>
            {(factions || []).filter(f => getInfluence(f.id) > 0).map(f => (
              <div
                key={f.id}
                title={`${f.name}: ${getInfluence(f.id)}`}
                style={{
                  height: '100%',
                  width: `${(getInfluence(f.id) / totalInfluence) * 100}%`,
                  background: f.colour,
                  transition: 'width 0.4s ease',
                }}
              />
            ))}
          </div>
        )}

        {/* Per-faction breakdown */}
        {isOrganiser ? (
          // Organiser: editable form
          <InfluenceOverrideForm
            campaignId={campaign.id}
            territoryId={territory.id}
            factions={factions || []}
            influence={influence || []}
          />
        ) : (
          // Players: read-only view
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {(factions || []).map(f => {
              const pts = getInfluence(f.id);
              const pct = totalInfluence > 0 ? (pts / totalInfluence) * 100 : 0;
              return (
                <div key={f.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                    <div style={{ width: '8px', height: '8px', background: f.colour, transform: 'rotate(45deg)', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{f.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.85rem', color: pts > 0 ? 'var(--text-gold)' : 'var(--text-muted)' }}>
                      {pts}
                    </span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: f.colour, transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              );
            })}
            {totalInfluence === 0 && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No battles have been fought here yet — influence will appear once the first battle is recorded.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Main content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>

        {/* Sub-territories panel */}
        {(children && children.length > 0) && (
          <div style={{ border: '1px solid var(--border-dim)', padding: '1.75rem' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.65rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--text-gold)',
              marginBottom: '1.25rem',
            }}>
              Sub-Territories
            </h2>
            <TerritoryChildList
              children={children}
              slug={slug}
              factionMap={factionMap}
            />
          </div>
        )}

        {/* Battles panel */}
        <div style={{ border: '1px solid var(--border-dim)', padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.65rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--text-gold)',
            }}>
              Battles Fought Here
            </h2>
            <Link href={`/c/${slug}/battle/new?territory=${territory.id}`} style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textDecoration: 'none' }}>
              Log battle →
            </Link>
          </div>
          {battles && battles.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {battles.map(battle => {
                const attacker = factionMap[battle.attacker_faction_id];
                const defender = factionMap[battle.defender_faction_id];
                const winner   = factionMap[battle.winner_faction_id];
                const isDraw   = !battle.winner_faction_id;
                const resultLabel = isDraw ? 'Draw'
                  : battle.winner_faction_id === battle.attacker_faction_id
                    ? `${attacker?.name ?? '?'} Victory`
                    : `${defender?.name ?? '?'} Victory`;
                const resultColour = isDraw ? 'var(--text-muted)' : (winner?.colour ?? 'var(--text-gold)');
                const date = new Date(battle.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                const hasScores = battle.attacker_score > 0 || battle.defender_score > 0;
                return (
                  <Link key={battle.id} href={`/c/${slug}/battle/${battle.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border-dim)', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {attacker?.name ?? '?'} <span style={{ color: 'var(--text-muted)' }}>vs</span> {defender?.name ?? '?'}
                        {hasScores && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                            ({battle.attacker_score}–{battle.defender_score})
                          </span>
                        )}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{date} →</span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: resultColour, marginBottom: battle.narrative ? '0.5rem' : 0 }}>
                      {resultLabel}
                    </div>
                    {battle.narrative && (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', fontStyle: 'italic', lineHeight: 1.5, marginTop: '0.4rem' }}>
                        {battle.narrative}
                      </p>
                    )}
                  </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ width: '6px', height: '6px', background: 'var(--gold)', transform: 'rotate(45deg)', margin: '0 auto 1rem', opacity: 0.4 }} />
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>No battles recorded here yet.</p>
            </div>
          )}
        </div>

        {/* Factions in campaign panel */}
        <div style={{ border: '1px solid var(--border-dim)', padding: '1.75rem' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.65rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--text-gold)',
            marginBottom: '1.25rem',
          }}>
            Campaign Factions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {(factions || []).map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '8px', height: '8px', background: f.colour, transform: 'rotate(45deg)', flexShrink: 0 }} />
                <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem', flex: 1 }}>{f.name}</span>
                {f.id === territory.controlling_faction_id && (
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.55rem',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: f.colour,
                  }}>Controls</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link href={`/c/${slug}/map`}>
          <button className="btn-secondary">← Back to Map</button>
        </Link>
      </div>
    </div>
  );
}
