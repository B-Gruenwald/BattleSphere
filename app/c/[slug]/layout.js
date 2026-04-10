import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import CampaignNavLinks from '@/app/components/CampaignNavLinks';

async function CampaignNav({ slug }) {
  const supabase = await createClient();
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('name')
    .eq('slug', slug)
    .single();

  if (!campaign) return null;

  const links = [
    { label: 'Map',          href: `/c/${slug}/map` },
    { label: 'Factions',     href: `/c/${slug}/factions` },
    { label: 'Players',      href: `/c/${slug}/players` },
    { label: 'Battles',      href: `/c/${slug}/battles` },
    { label: 'Events',       href: `/c/${slug}/events` },
    { label: 'Chronicle',    href: `/c/${slug}/chronicle` },
    { label: 'Achievements', href: `/c/${slug}/achievements` },
  ];

  return (
    <div style={{
      borderBottom: '1px solid var(--border-dim)',
      background: 'rgba(10,10,15,0.6)',
      backdropFilter: 'blur(8px)',
      flexShrink: 0,
      position: 'relative',
    }}>
      <CampaignNavLinks
        slug={slug}
        campaignName={campaign.name}
        links={links}
      />
    </div>
  );
}

export default async function CampaignLayout({ children, params }) {
  const { slug } = await params;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)' }}>
      <CampaignNav slug={slug} />
      <div style={{ flex: 1 }}>
        {children}
      </div>
    </div>
  );
}
