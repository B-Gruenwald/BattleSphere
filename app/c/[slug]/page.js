import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function CampaignDashboard({ params }) {
  const { slug } = await params;
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

  // Fetch factions
  const { data: factions } = await supabase
    .from('factions')
    .select('*')
    .eq('campaign_id', campaign.id)
    .order('created_at');

  // Fetch member count
  const { count: memberCount } = await supabase
    .from('campaign_members')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaign.id);

  // Fetch territory count
  const { count: territoryCount } = await supabase
    .from('territories')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaign.id);

  const isOrganiser = campaign.organiser_id === user.id;

  const SETTING_LABELS = {
    'Gothic Sci-Fi': 'Gothic Sci-Fi · Warhammer 40,000',
    'Space Opera': 'Space Opera',
    'High Fantasy': 'High Fantasy',
    'Historical': 'Historical',
    'Custom': 'Custom Setting',
  };

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>

      {/* Campaign header */}
      <div style={{ marginBottom: '3rem' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.75rem' }}>
          {SETTING_LABELS[campaign.setting] || campaign.setting}
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {campaign.name}
          </h1>
          {isOrganiser && (
            <Link href={`/c/${slug}/admin`}>
              <button className="btn-secondary" style={{ padding: '0.5rem 1.25rem' }}>Admin</button>
            </Link>
          )}
        </div>
        {campaign.description && (
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '0.75rem', maxWidth: '600px', lineHeight: 1.6 }}>
            {campaign.description}
          </p>
        )}
      </div>

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', borderTop: '1px solid var(--border-dim)', borderBottom: '1px solid var(--border-dim)', marginBottom: '3rem' }}>
        {[
          { label: 'Factions', value: factions?.length ?? 0 },
          { label: 'Players', value: memberCount ?? 0 },
          { label: 'Territories', value: territoryCount ?? 0 },
          { label: 'Battles', value: 0 },
        ].map((stat, i, arr) => (
          <div key={stat.label} style={{ padding: '1.5rem 1rem', textAlign: 'center', borderRight: i < arr.length - 1 ? '1px solid var(--border-dim)' : 'none' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{stat.value}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>

        {/* Factions */}
        <div style={{ border: '1px solid var(--border-dim)', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>
              Faction Standings
            </h2>
            <Link href={`/c/${slug}/factions`} style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textDecoration: 'none' }}>View all →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {factions && factions.length > 0 ? factions.map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '10px', height: '10px', background: f.colour, flexShrink: 0 }} />
                <span style={{ color: 'var(--text-primary)', fontSize: '0.95rem', flex: 1 }}>{f.name}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>0 wins</span>
              </div>
            )) : (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>No factions yet.</p>
            )}
          </div>
        </div>

        {/* Recent battles */}
        <div style={{ border: '1px solid var(--border-dim)', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>
              Recent Battles
            </h2>
          </div>
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ width: '6px', height: '6px', background: 'var(--gold)', transform: 'rotate(45deg)', margin: '0 auto 1rem', opacity: 0.4 }} />
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>
              No battles recorded yet.
            </p>
          </div>
        </div>

        {/* Active events */}
        <div style={{ border: '1px solid var(--border-dim)', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>
              Active Events
            </h2>
          </div>
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ width: '6px', height: '6px', background: 'var(--gold)', transform: 'rotate(45deg)', margin: '0 auto 1rem', opacity: 0.4 }} />
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>
              No active events.
            </p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link href={`/c/${slug}/map`}>
          <button className="btn-primary">View Campaign Map</button>
        </Link>
        <Link href={`/c/${slug}/battle/new`}>
          <button className="btn-secondary">Log a Battle</button>
        </Link>
        <Link href={`/c/${slug}/factions`}>
          <button className="btn-secondary">Browse Factions</button>
        </Link>
      </div>
    </div>
  );
}
