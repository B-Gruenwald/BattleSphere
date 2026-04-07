import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import MapEditForm from '@/app/components/MapEditForm';
import MapRouteEditor from '@/app/components/MapRouteEditor';

export default async function EditMapPage({ params }) {
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

  // Admin-only — check role
  const { data: membership } = await supabase
    .from('campaign_members')
    .select('role')
    .eq('campaign_id', campaign.id)
    .eq('user_id', user.id)
    .single();

  const isAdmin = membership?.role === 'admin'
    || membership?.role === 'organiser'
    || campaign.organiser_id === user.id;
  if (!isAdmin) redirect(`/c/${slug}/map`);

  const { data: territories } = await supabase
    .from('territories')
    .select('*')
    .eq('campaign_id', campaign.id)
    .order('depth')
    .order('name');

  const { data: factions } = await supabase
    .from('factions')
    .select('*')
    .eq('campaign_id', campaign.id);

  const { data: warpRoutes } = await supabase
    .from('warp_routes')
    .select('*')
    .eq('campaign_id', campaign.id);

  const territoryCount = territories?.length ?? 0;

  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '860px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.6rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--text-gold)',
              marginBottom: '0.5rem',
            }}>
              {campaign.name} · Admin
            </p>
            <h1 style={{
              fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
              fontWeight: '900',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              Edit Map
            </h1>
          </div>
          <Link href={`/c/${slug}/map`}>
            <button className="btn-secondary">← Back to Map</button>
          </Link>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          {territoryCount} {territoryCount === 1 ? 'territory' : 'territories'} · Add, edit, or delete territories and sub-territories. Each row saves independently.
        </p>
      </div>

      <div style={{ borderTop: '1px solid var(--border-dim)', marginBottom: '2.5rem' }} />

      {/* ── Warp Route Editor ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.65rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--text-gold)',
          marginBottom: '0.5rem',
        }}>
          Warp Routes
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Click a territory to select it, then click another to add or remove a connection.
          Only top-level territories can have warp routes.
        </p>
        <MapRouteEditor
          territories={territories || []}
          initialRoutes={warpRoutes || []}
          campaignId={campaign.id}
        />
      </div>

      <div style={{ borderTop: '1px solid var(--border-dim)', marginBottom: '2.5rem' }} />

      {/* ── Territory List ────────────────────────────────────────────────── */}
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '0.65rem',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: 'var(--text-gold)',
        marginBottom: '1.5rem',
      }}>
        Territories
      </h2>

      <MapEditForm
        territories={territories || []}
        factions={factions || []}
        campaignId={campaign.id}
        campaignSlug={slug}
      />
    </div>
  );
}
