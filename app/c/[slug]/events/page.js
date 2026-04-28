import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

const TYPE_LABELS = {
  narrative:    'Narrative',
  mechanic:     'Game Mechanic',
  special_rule: 'Special Rule',
  mission:      'Mission',
};

const STATUS_COLOURS = {
  upcoming: '#6a8fc7',
  active:   '#b78c40',
  resolved: '#5a5445',
};

const STATUS_ORDER = { active: 0, upcoming: 1, resolved: 2 };

export default async function EventsPage({ params }) {
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

  const { data: events } = await supabase
    .from('campaign_events')
    .select('*')
    .eq('campaign_id', campaign.id)
    .order('created_at', { ascending: false });

  const { data: factions } = await supabase
    .from('factions')
    .select('id, name, colour')
    .eq('campaign_id', campaign.id);

  const { data: territories } = await supabase
    .from('territories')
    .select('id, name')
    .eq('campaign_id', campaign.id);

  const { data: myMembership } = await supabase
    .from('campaign_members')
    .select('role')
    .eq('campaign_id', campaign.id)
    .eq('user_id', user.id)
    .single();
  const isOrganiser = campaign.organiser_id === user.id
    || ['organiser', 'admin'].includes(myMembership?.role);

  // Compute effective status: an event that is still marked 'active' but whose
  // ends_at is in the past should display (and sort) as 'resolved'.
  function effectiveStatus(ev) {
    if (ev.status === 'resolved') return 'resolved';
    if (ev.ends_at && new Date(ev.ends_at) < new Date()) return 'resolved';
    if (ev.status === 'upcoming') return 'upcoming';
    // 'active' — check starts_at hasn't been set to a future date
    if (ev.starts_at && new Date(ev.starts_at) > new Date()) return 'upcoming';
    return 'active';
  }

  const sorted = [...(events || [])]
    .map(ev => ({ ...ev, _effectiveStatus: effectiveStatus(ev) }))
    .sort((a, b) => (STATUS_ORDER[a._effectiveStatus] ?? 3) - (STATUS_ORDER[b._effectiveStatus] ?? 3));

  function resolveNames(ids, list) {
    if (!ids || ids.length === 0) return null;
    return ids.map(i => list?.find(x => x.id === i)?.name ?? '?');
  }

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '900px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '3rem' }}>
        <div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.5rem' }}>
            Campaign Events
          </p>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: '900', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {campaign.name}
          </h1>
        </div>
        {isOrganiser && (
          <Link href={`/c/${slug}/events/new`}>
            <button className="btn-primary">+ Post Event</button>
          </Link>
        )}
      </div>

      {/* Events list */}
      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '6rem 2rem', border: '1px solid var(--border-dim)' }}>
          <div style={{ width: '8px', height: '8px', background: 'var(--gold)', transform: 'rotate(45deg)', margin: '0 auto 1.5rem', opacity: 0.3 }} />
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '1rem' }}>
            No events have been posted yet.
          </p>
          {isOrganiser && (
            <Link href={`/c/${slug}/events/new`}>
              <button className="btn-secondary" style={{ marginTop: '0.5rem' }}>Post the First Event</button>
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {sorted.map(ev => {
            const statusColour = STATUS_COLOURS[ev._effectiveStatus] ?? 'var(--text-muted)';
            const date = new Date(ev.created_at).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric',
            });

            const hasBonus = ev.influence_bonus != null;
            const bonusTerritoryNames = resolveNames(ev.bonus_territory_ids, territories);
            const bonusBattleTypes    = ev.bonus_battle_types?.length ? ev.bonus_battle_types : null;
            const bonusFactionNames   = resolveNames(ev.bonus_faction_ids, factions);

            // Build compact condition string
            const conditions = [];
            if (bonusTerritoryNames) conditions.push(bonusTerritoryNames.join(', '));
            else if (hasBonus)       conditions.push('Any territory');
            if (bonusBattleTypes)    conditions.push(bonusBattleTypes.join(', '));
            else if (hasBonus)       conditions.push('Any battle type');
            if (bonusFactionNames)   conditions.push(bonusFactionNames.join(', '));
            else if (hasBonus)       conditions.push('Any faction');

            // Territory Cascade
            const hasCascade = ev.cascade_bonus != null && ev.cascade_territory_id != null;
            const cascadeTerritoryName = hasCascade
              ? (territories?.find(t => t.id === ev.cascade_territory_id)?.name ?? '?')
              : null;

            return (
              <Link
                key={ev.id}
                href={`/c/${slug}/events/${ev.id}`}
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <div style={{
                  padding: '1.5rem 1.75rem',
                  background: ev._effectiveStatus === 'active' ? 'rgba(183,140,64,0.04)' : 'transparent',
                  border: '1px solid var(--border-dim)',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>

                    {/* Status dot */}
                    <div style={{
                      width: '8px', height: '8px',
                      background: statusColour,
                      transform: 'rotate(45deg)',
                      flexShrink: 0,
                      marginTop: '0.45rem',
                    }} />

                    {/* Main content */}
                    <div style={{ flex: 1, minWidth: 0 }}>

                      {/* Title + status badge */}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
                          {ev.title}
                        </h2>
                        <span style={{
                          fontFamily: 'var(--font-display)', fontSize: '0.52rem',
                          letterSpacing: '0.12em', textTransform: 'uppercase',
                          color: statusColour, border: `1px solid ${statusColour}40`,
                          padding: '0.15rem 0.5rem', flexShrink: 0,
                        }}>
                          {ev._effectiveStatus}
                        </span>
                        {hasBonus && (
                          <span style={{
                            fontFamily: 'var(--font-display)', fontSize: '0.52rem',
                            letterSpacing: '0.12em', textTransform: 'uppercase',
                            color: 'var(--text-gold)', border: '1px solid rgba(183,140,64,0.35)',
                            padding: '0.15rem 0.5rem', flexShrink: 0,
                          }}>
                            ⬡ +{ev.influence_bonus}
                          </span>
                        )}
                        {hasCascade && (
                          <span style={{
                            fontFamily: 'var(--font-display)', fontSize: '0.52rem',
                            letterSpacing: '0.12em', textTransform: 'uppercase',
                            color: 'var(--text-gold)', border: '1px solid rgba(183,140,64,0.35)',
                            padding: '0.15rem 0.5rem', flexShrink: 0,
                          }}>
                            ↝ +{ev.cascade_bonus}
                          </span>
                        )}
                      </div>

                      {/* Type + date meta */}
                      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginBottom: ev.body || hasBonus ? '0.6rem' : 0 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                          {TYPE_LABELS[ev.event_type] ?? ev.event_type}
                        </span>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                          {date}
                        </span>
                      </div>

                      {/* Body snippet */}
                      {ev.body && (
                        <p style={{
                          color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic',
                          lineHeight: 1.55, marginBottom: (hasBonus || hasCascade) ? '0.65rem' : 0,
                          overflow: 'hidden', display: '-webkit-box',
                          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        }}>
                          {ev.body}
                        </p>
                      )}

                      {/* Bonus summary line */}
                      {hasBonus && (
                        <p style={{
                          fontSize: '0.78rem', color: 'var(--text-gold)',
                          fontFamily: 'var(--font-display)', letterSpacing: '0.06em',
                          marginBottom: hasCascade ? '0.3rem' : 0,
                        }}>
                          ⬡ +{ev.influence_bonus} Influence and XP · {conditions.join(' · ')}
                        </p>
                      )}

                      {/* Territory Cascade summary line */}
                      {hasCascade && (
                        <p style={{
                          fontSize: '0.78rem', color: 'var(--text-gold)',
                          fontFamily: 'var(--font-display)', letterSpacing: '0.06em',
                        }}>
                          ↝ +{ev.cascade_bonus} Territory Cascade · Winning faction · {cascadeTerritoryName} & connections
                        </p>
                      )}
                    </div>

                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', flexShrink: 0, alignSelf: 'center' }}>→</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
