import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import FactionStandingsTable from '@/app/components/FactionStandingsTable';

export default async function FactionsPage({ params }) {
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

  const { data: factions } = await supabase
    .from('factions')
    .select('*')
    .eq('campaign_id', campaign.id)
    .order('created_at');

  const { data: battles } = await supabase
    .from('battles')
    .select('attacker_faction_id, defender_faction_id, winner_faction_id')
    .eq('campaign_id', campaign.id);

  const { data: territories } = await supabase
    .from('territories')
    .select('controlling_faction_id')
    .eq('campaign_id', campaign.id)
    .not('controlling_faction_id', 'is', null);

  // Build stats per faction, sorted by wins then territories
  function getStats(factionId) {
    const fought   = (battles || []).filter(b => b.attacker_faction_id === factionId || b.defender_faction_id === factionId);
    const wins     = fought.filter(b => b.winner_faction_id === factionId).length;
    const draws    = fought.filter(b => b.winner_faction_id === null).length;
    const losses   = fought.length - wins - draws;
    const controlled = (territories || []).filter(t => t.controlling_faction_id === factionId).length;
    return { played: fought.length, wins, draws, losses, controlled };
  }

  const factionsWithStats = (factions || [])
    .map(f => ({ ...f, stats: getStats(f.id) }))
    .sort((a, b) => b.stats.wins - a.stats.wins || b.stats.controlled - a.stats.controlled);

  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '900px', margin: '0 auto' }}>

      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2.5rem' }}>
        <Link href={`/c/${slug}`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>
          {campaign.name}
        </Link>
        <span style={{ color: 'var(--border-dim)', fontSize: '0.8rem' }}>›</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Factions</span>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.5rem' }}>
          {campaign.name}
        </p>
        <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Faction Standings
        </h1>
      </div>

      <div style={{ borderTop: '1px solid var(--border-dim)', marginBottom: '2.5rem' }} />

      <FactionStandingsTable factions={factionsWithStats} slug={slug} />

      <div style={{ marginTop: '2.5rem' }}>
        <Link href={`/c/${slug}`}>
          <button className="btn-secondary">← Campaign Dashboard</button>
        </Link>
      </div>
    </div>
  );
}
