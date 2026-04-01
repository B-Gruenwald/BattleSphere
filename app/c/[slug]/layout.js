import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

async function CampaignNav({ slug }) {
  const supabase = await createClient();
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('name')
    .eq('slug', slug)
    .single();

  if (!campaign) return null;

  const links = [
    { label: 'Map',      href: `/c/${slug}/map` },
    { label: 'Factions', href: `/c/${slug}/factions` },
    { label: 'Players',  href: `/c/${slug}/players` },
    { label: 'Battles',  href: `/c/${slug}/battles` },
    { label: 'Events',   href: `/c/${slug}/events` },
  ];

  return (
    <div style={{
      borderBottom: '1px solid var(--border-dim)',
      background: 'rgba(10,10,15,0.6)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem',
      height: '44px',
      flexShrink: 0,
    }}>
      {/* Campaign name */}
      <Link href={`/c/${slug}`} style={{
        fontFamily: 'var(--font-display)',
        fontSize: '0.6rem',
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: 'var(--text-gold)',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '220px',
        flexShrink: 0,
      }}>
        {campaign.name}
      </Link>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', overflow: 'auto' }}>
        {links.map(l => (
          <Link key={l.label} href={l.href} style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.58rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            transition: 'color 0.15s',
          }}>
            {l.label}
          </Link>
        ))}

        {/* Log Battle — primary action */}
        <Link href={`/c/${slug}/battle/new`}>
          <button style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.55rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            background: 'rgba(183,140,64,0.12)',
            border: '1px solid rgba(183,140,64,0.4)',
            color: 'var(--text-gold)',
            padding: '0.3rem 0.85rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}>
            + Log Battle
          </button>
        </Link>
      </div>
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
