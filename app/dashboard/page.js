import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import CampaignCard from '@/app/components/CampaignCard';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const username = user.user_metadata?.username || user.email;

  const { data: memberships } = await supabase
    .from('campaign_members')
    .select('role, campaigns(id, slug, name, setting, created_at, organiser_id)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false });

  const campaigns = memberships?.map(m => ({ ...m.campaigns, role: m.role })) ?? [];

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '3rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.75rem' }}>
            Commander Overview
          </p>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '700' }}>Welcome, {username}</h1>
        </div>
        <Link href="/campaign/new">
          <button className="btn-primary">+ New Campaign</button>
        </Link>
      </div>

      {/* Campaigns */}
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '1.5rem' }}>
          My Campaigns
        </h2>

        {campaigns.length === 0 ? (
          <div style={{ border: '1px solid var(--border-dim)', padding: '4rem 2rem', textAlign: 'center', background: 'rgba(255,255,255,0.01)' }}>
            <div style={{ width: '8px', height: '8px', background: 'var(--gold)', transform: 'rotate(45deg)', margin: '0 auto 1.5rem', opacity: 0.4 }} />
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.75rem' }}>
              No campaigns yet
            </p>
            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.95rem', marginBottom: '2rem' }}>
              Create your first Campaign Space to get started.
            </p>
            <Link href="/campaign/new">
              <button className="btn-primary">Create Campaign</button>
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {campaigns.map(c => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
