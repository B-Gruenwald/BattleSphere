import { notFound, redirect } from 'next/navigation';
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

  return (
    <div style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* Map header */}
      <div style={{
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

        {/* Faction legend */}
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
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

      {/* Map canvas */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <CampaignMap
          territories={territories || []}
          factions={factions || []}
          campaignSlug={slug}
          setting={campaign.setting}
        />
      </div>
    </div>
  );
}
