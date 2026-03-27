import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const username = user.user_metadata?.username || user.email;

  // Fetch campaigns the user belongs to
  const { data: memberships } = await supabase
    .from('campaign_members')
    .select('role, campaigns(id, slug, name, setting, created_at, organiser_id)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false });

  const campaigns = memberships?.map(m => ({ ...m.campaigns, role: m.role })) ?? [];

  const SETTING_ICON = {
    'Gothic Sci-Fi': '☩', 'Space Opera': '✦', 'High Fantasy': '⚔',
    'Historical': '⚜', 'Custom': '◈',
  };

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
      <div style={{ marginBottom: '1.5rem' }}>
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
              <Link key={c.id} href={`/c/${c.slug}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  border: '1px solid var(--border-dim)', padding: '1.75rem',
                  background: 'rgba(255,255,255,0.02)', cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-dim)'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '1.25rem', opacity: 0.7 }}>{SETTING_ICON[c.setting] || '◈'}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: c.role === 'Organiser' ? 'var(--text-gold)' : 'var(--text-muted)', border: '1px solid', borderColor: c.role === 'Organiser' ? 'var(--gold)' : 'var(--border-dim)', padding: '0.2rem 0.5rem' }}>
                      {c.role}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.35rem', letterSpacing: '0.04em' }}>
                    {c.name}
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>{c.setting}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
