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

  const { data: myMembership } = await supabase
    .from('campaign_members')
    .select('role')
    .eq('campaign_id', campaign.id)
    .eq('user_id', user.id)
    .single();
  const isOrganiser = campaign.organiser_id === user.id
    || ['organiser', 'admin'].includes(myMembership?.role);
  const statusColour = STATUS_COLOURS[ev.status] ?? 'var(--text-muted)';

  function factionNames(ids) {
    if (!ids || ids.length === 0) return null;
    return ids.map(fid => factions?.find(f => f.id === fid)?.name ?? '?').join(', ');
  }

  const affectedLabel = factionNames(ev.affected_factions);

  const createdDate = new Date(ev.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  function formatDatetime(dt) {
    if (!dt) return null;
    return new Date(dt).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

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
      </div>

      {/* Title */}
      <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.6rem)', fontWeight: '900', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '1rem', lineHeight: 1.15 }}>
        {ev.title}
      </h1>

      {/* Meta row */}
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '2.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-dim)' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.2rem' }}>
            Posted
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{createdDate}</div>
        </div>
        {affectedLabel && (
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.2rem' }}>
              Affects
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{affectedLabel}</div>
          </div>
        )}
        {ev.starts_at && (
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.2rem' }}>
              Starts
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{formatDatetime(ev.starts_at)}</div>
          </div>
        )}
        {ev.ends_at && (
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.2rem' }}>
              Ends
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{formatDatetime(ev.ends_at)}</div>
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
          marginBottom: '3rem',
        }}>
          {ev.body}
        </div>
      ) : (
        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '3rem' }}>
          No further details were posted for this event.
        </p>
      )}

      {/* Affected factions chips */}
      {ev.affected_factions && ev.affected_factions.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.75rem' }}>
            Affected Factions
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {ev.affected_factions.map(fid => {
              const faction = factions?.find(f => f.id === fid);
              if (!faction) return null;
              return (
                <Link key={fid} href={`/c/${slug}/faction/${fid}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.35rem 0.75rem',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-raised)',
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: 'var(--text-secondary)',
                  }}>
                    <span style={{ width: '8px', height: '8px', background: faction.colour, display: 'inline-block', flexShrink: 0 }} />
                    {faction.name}
                  </div>
                </Link>
              );
            })}
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
