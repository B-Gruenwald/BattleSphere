import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import CampaignMap from '@/app/components/CampaignMap';

export default async function MapPage({ params }) {
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

  const { data: territories } = await supabase
    .from('territories')
    .select('*')
    .eq('campaign_id', campaign.id)
    .order('depth')
    .order('created_at');

  const { data: factions } = await supabase
    .from('factions')
    .select('*')
    .eq('campaign_id', campaign.id);

  // Fetch influence data so the map can colour nodes by dominant faction
  const { data: influenceData } = await supabase
    .from('territory_influence')
    .select('*')
    .eq('campaign_id', campaign.id);

  // Check if current user is admin
  const { data: membership } = await supabase
    .from('campaign_members')
    .select('role')
    .eq('campaign_id', campaign.id)
    .eq('user_id', user.id)
    .single();
  const isAdmin = membership?.role === 'admin'
    || membership?.role === 'organiser'
    || campaign.organiser_id === user.id;

  // Build territory hierarchy for sidebar: sort parents alphabetically, then children under their parent
  const roots = (territories || [])
    .filter(t => !t.parent_id)
    .sort((a, b) => a.name.localeCompare(b.name));
  const children = (territories || [])
    .filter(t => t.parent_id)
    .sort((a, b) => a.name.localeCompare(b.name));
  const factionMap = Object.fromEntries((factions || []).map(f => [f.id, f]));

  // Build ordered list: each root followed by its children
  const orderedTerritories = roots.flatMap(root => [
    { ...root, isChild: false },
    ...children.filter(c => c.parent_id === root.id).map(c => ({ ...c, isChild: true })),
  ]);
  // Append any orphan children (parent not in roots)
  const rootIds = new Set(roots.map(r => r.id));
  children.filter(c => !rootIds.has(c.parent_id)).forEach(c => orderedTerritories.push({ ...c, isChild: true }));

  return (
    <div className="map-page-root" style={{ height: 'calc(100vh - 108px)', display: 'flex', flexDirection: 'column' }}>
      {/* Map header */}
      <div className="map-header" style={{
        padding: '1rem 2rem',
        borderBottom: '1px solid var(--border-dim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.2rem' }}>
            Theatre of War
          </p>
          <h1 style={{ fontSize: '1.1rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {campaign.name}
          </h1>
        </div>

        {/* Admin: Edit Map button */}
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          {isAdmin && (
            <Link href={`/c/${slug}/map/edit`}>
              <button className="btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                Edit Map
              </button>
            </Link>
          )}
        </div>

        {/* Faction legend */}
        <div className="map-legend" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          {factions?.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '10px', height: '10px', background: f.colour, borderRadius: '2px' }} />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                {f.name}
              </span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '10px', height: '10px', background: 'var(--border-dim)', borderRadius: '2px' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Contested
            </span>
          </div>
        </div>
      </div>

      {/* Map canvas + sidebar */}
      <div className="map-content-area" style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {/* Map */}
        <div className="map-canvas-wrap" style={{ flex: 1, overflow: 'hidden' }}>
          <CampaignMap
            territories={territories || []}
            factions={factions || []}
            influenceData={influenceData || []}
            campaignSlug={slug}
            setting={campaign.setting}
          />
        </div>

        {/* Territory sidebar */}
        <div className="map-sidebar" style={{
          width: '220px',
          borderLeft: '1px solid var(--border-dim)',
          background: 'rgba(10,10,15,0.7)',
          backdropFilter: 'blur(8px)',
          overflowY: 'auto',
          flexShrink: 0,
          padding: '1rem 0',
        }}>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.55rem',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--text-gold)',
            padding: '0 1rem 0.75rem',
            borderBottom: '1px solid var(--border-dim)',
            marginBottom: '0.5rem',
          }}>
            Territories
          </p>
          {orderedTerritories.length === 0 ? (
            <p style={{ padding: '1rem', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>No territories yet.</p>
          ) : (
            orderedTerritories.map(t => {
              const controller = t.controlling_faction_id ? factionMap[t.controlling_faction_id] : null;
              return (
                <Link key={t.id} href={`/c/${slug}/territory/${t.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    padding: `0.45rem 1rem 0.45rem ${t.isChild ? '2rem' : '1rem'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                  }}>
                    {t.isChild && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', flexShrink: 0, marginLeft: '-0.75rem' }}>↳</span>
                    )}
                    {controller && (
                      <div style={{ width: '6px', height: '6px', background: controller.colour, flexShrink: 0, borderRadius: '1px' }} />
                    )}
                    <span style={{
                      fontSize: t.isChild ? '0.78rem' : '0.85rem',
                      color: t.isChild ? 'var(--text-secondary)' : 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {t.name}
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
