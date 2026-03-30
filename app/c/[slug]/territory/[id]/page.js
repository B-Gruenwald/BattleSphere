import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import TerritoryChildList from '@/app/components/TerritoryChildList';

export default async function TerritoryPage({ params }) {
  const { slug, id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

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

  const factionMap = Object.fromEntries((factions || []).map(f => [f.id, f]));
  const controllingFaction = territory.controlling_faction_id
    ? factionMap[territory.controlling_faction_id]
    : null;

  const isOrganiser = campaign.organiser_id === user.id;

  const DEPTH_LABELS = { 1: 'Region', 2: 'Sector', 3: 'Location' };
  const depthLabel = DEPTH_LABELS[territory.depth] || 'Territory';

  // Status colour for controlling faction
  const statusColour = controllingFaction?.colour || 'var(--border-dim)';
  const statusLabel = controllingFaction?.name || 'Contested';

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
          <h1 style={{
            fontSize: 'clamp(1.6rem, 4vw, 2.6rem)',
            fontWeight: '900',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            {territory.name}
          </h1>

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

      {/* Divider line */}
      <div style={{ borderTop: '1px solid var(--border-dim)', marginBottom: '2.5rem' }} />

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
          </div>
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ width: '6px', height: '6px', background: 'var(--gold)', transform: 'rotate(45deg)', margin: '0 auto 1rem', opacity: 0.4 }} />
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>
              No battles recorded here yet.
            </p>
          </div>
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
        <Link href={`/c/${slug}/battle/new?territory=${territory.id}`}>
          <button className="btn-primary">Log a Battle Here</button>
        </Link>
        <Link href={`/c/${slug}/map`}>
          <button className="btn-secondary">← Back to Map</button>
        </Link>
        {isOrganiser && (
          <Link href={`/c/${slug}/territory/${territory.id}/edit`}>
            <button className="btn-secondary">Edit Territory</button>
          </Link>
        )}
      </div>
    </div>
  );
}
