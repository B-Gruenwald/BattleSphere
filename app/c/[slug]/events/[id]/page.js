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

export default async function EventDetailPage({ params }) {
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

  const { data: ev } = await supabase
    .from('campaign_events')
    .select('*')
    .eq('id', id)
    .eq('campaign_id', campaign.id)
    .single();
  if (!ev) notFound();

  const { data: factions } = await supabase
    .from('factions')
    .select('*')
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
  const statusColour = STATUS_COLOURS[ev.status] ?? 'var(--text-muted)';

  const createdDate = new Date(ev.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  function formatDatetime(dt) {
    if (!dt) return null;
    return new Date(dt).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  // Resolve bonus condition labels
  const hasBonus = ev.influence_bonus != null;

  function resolveNames(ids, list, key = 'name') {
    if (!ids || ids.length === 0) return null;
    return ids.map(i => list?.find(x => x.id === i)?.[key] ?? '?');
  }

  const bonusTerritoryNames = resolveNames(ev.bonus_territory_ids, territories);
  const bonusFactionData    = ev.bonus_faction_ids?.length
    ? ev.bonus_faction_ids.map(fid => factions?.find(f => f.id === fid)).filter(Boolean)
    : null;

  // Territory Cascade
  const hasCascade = ev.cascade_bonus != null && ev.cascade_territory_id != null;
  const cascadeTerritoryName = hasCascade
    ? (territories?.find(t => t.id === ev.cascade_territory_id)?.name ?? 'Unknown territory')
    : null;

  const metaLabel = { fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.2rem' };
  const metaValue = { color: 'var(--text-secondary)', fontSize: '0.9rem' };

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto' }}>

      {/* Breadcrumb */}
      <div style={{ marginBottom: '2rem' }}>
        <Link href={`/c/${slug}/events`} style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', textDecoration: 'none' }}>
          ← Events
        </Link>
      </div>

      {/* Status badge + type */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.55rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: statusColour,
          border: `1px solid ${statusColour}50`,
          padding: '0.2rem 0.6rem',
        }}>
          {ev.status}
        </span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          {TYPE_LABELS[ev.event_type] ?? ev.event_type}
        </span>
        {hasBonus && (
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--text-gold)',
            border: '1px solid rgba(183,140,64,0.4)', padding: '0.2rem 0.6rem',
          }}>
            ⬡ +{ev.influence_bonus} Influence Bonus
          </span>
        )}
        {hasCascade && (
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--text-gold)',
            border: '1px solid rgba(183,140,64,0.4)', padding: '0.2rem 0.6rem',
          }}>
            ↝ +{ev.cascade_bonus} Territory Cascade
          </span>
        )}
      </div>

      {/* Title */}
      <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.6rem)', fontWeight: '900', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '1rem', lineHeight: 1.15 }}>
        {ev.title}
      </h1>

      {/* Meta row */}
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '2.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-dim)' }}>
        <div>
          <div style={metaLabel}>Posted</div>
          <div style={metaValue}>{createdDate}</div>
        </div>
        {ev.starts_at && (
          <div>
            <div style={metaLabel}>Starts</div>
            <div style={metaValue}>{formatDatetime(ev.starts_at)}</div>
          </div>
        )}
        {ev.ends_at && (
          <div>
            <div style={metaLabel}>Ends</div>
            <div style={metaValue}>{formatDatetime(ev.ends_at)}</div>
          </div>
        )}
      </div>

      {/* Body */}
      {ev.body ? (
        <div style={{
          color: 'var(--text-primary)',
          fontSize: '1.05rem',
          lineHeight: 1.75,
          fontStyle: 'italic',
          whiteSpace: 'pre-wrap',
          marginBottom: '2.5rem',
        }}>
          {ev.body}
        </div>
      ) : (
        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '2.5rem' }}>
          No further details were posted for this event.
        </p>
      )}

      {/* Influence bonus summary */}
      {hasBonus && (
        <div style={{
          border: '1px solid rgba(183,140,64,0.35)',
          background: 'rgba(183,140,64,0.05)',
          padding: '1.5rem',
          marginBottom: '3rem',
        }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '1.25rem' }}>
            Influence Bonus — Active Rules
          </p>

          {/* Bonus amount */}
          <div style={{ marginBottom: '1.25rem' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.55rem' }}>Bonus</p>
            <p style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-gold)' }}>
              +{ev.influence_bonus} Influence and XP
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Awarded to both factions and both players on every qualifying battle.
            </p>
          </div>

          {/* Conditions */}
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Qualifying battles must match all conditions below
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>

            {/* Territory */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', minWidth: '90px', paddingTop: '0.1rem' }}>
                Territory
              </span>
              {bonusTerritoryNames && bonusTerritoryNames.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {bonusTerritoryNames.map((name, i) => (
                    <span key={i} style={{ padding: '0.2rem 0.55rem', background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {name}
                    </span>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Any territory</span>
              )}
            </div>

            {/* Battle type */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', minWidth: '90px', paddingTop: '0.1rem' }}>
                Battle Type
              </span>
              {ev.bonus_battle_types && ev.bonus_battle_types.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {ev.bonus_battle_types.map((t, i) => (
                    <span key={i} style={{ padding: '0.2rem 0.55rem', background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {t}
                    </span>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Any battle type</span>
              )}
            </div>

            {/* Factions */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', minWidth: '90px', paddingTop: '0.1rem' }}>
                Faction
              </span>
              {bonusFactionData && bonusFactionData.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {bonusFactionData.map(f => (
                    <Link key={f.id} href={`/c/${slug}/faction/${f.id}`} style={{ textDecoration: 'none' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                        padding: '0.2rem 0.55rem', background: 'var(--bg-raised)',
                        border: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--text-secondary)',
                      }}>
                        <span style={{ width: '7px', height: '7px', background: f.colour, display: 'inline-block', flexShrink: 0, borderRadius: '1px' }} />
                        {f.name}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Any faction</span>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Territory Cascade summary */}
      {hasCascade && (
        <div style={{
          border: '1px solid rgba(183,140,64,0.35)',
          background: 'rgba(183,140,64,0.05)',
          padding: '1.5rem',
          marginBottom: '3rem',
        }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '1.25rem' }}>
            Territory Cascade — Active Rules
          </p>

          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.55rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Cascade Bonus</p>
            <p style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-gold)' }}>
              +{ev.cascade_bonus} Influence per connected territory
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Awarded to the winning faction only. No XP effect.
            </p>
          </div>

          <div>
            <p style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.55rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Trigger Territory</p>
            <span style={{ padding: '0.2rem 0.55rem', background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {cascadeTerritoryName}
            </span>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.45rem' }}>
              Fires when the winner's battle is fought in this territory or any of its sub-territories. Influence cascades into every directly connected territory.
            </p>
          </div>
        </div>
      )}

      {/* Organiser actions */}
      {isOrganiser && (
        <div style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--border-dim)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href={`/c/${slug}/events/${ev.id}/edit`}>
            <button className="btn-secondary">Edit Event</button>
          </Link>
        </div>
      )}
    </div>
  );
}
