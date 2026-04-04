import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import RequestsList from './RequestsList';

export default async function JoinRequestsPage({ params }) {
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

  // Organiser only
  if (campaign.organiser_id !== user.id) redirect(`/c/${slug}`);

  // Fetch all join requests for this campaign
  const { data: rawRequests } = await supabase
    .from('join_requests')
    .select('*')
    .eq('campaign_id', campaign.id)
    .order('created_at', { ascending: false });

  // Fetch profiles for all requesters
  const requesterIds = [...new Set((rawRequests || []).map(r => r.user_id))];
  const { data: profiles } = requesterIds.length > 0
    ? await supabase.from('profiles').select('id, display_name, username').in('id', requesterIds)
    : { data: [] };

  const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
  const requests = (rawRequests || []).map(r => ({
    ...r,
    profile: profileMap[r.user_id] || null,
  }));

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '860px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '3rem' }}>
        <div>
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.2em',
            textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.5rem',
          }}>
            {campaign.name} · Admin
          </p>
          <h1 style={{
            fontSize: 'clamp(1.5rem, 3vw, 2.4rem)', fontWeight: '900',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            Join Requests
            {pendingCount > 0 && (
              <span style={{
                display: 'inline-block', marginLeft: '0.75rem',
                background: 'rgba(183,140,64,0.15)',
                border: '1px solid rgba(183,140,64,0.4)',
                color: 'var(--text-gold)',
                fontFamily: 'var(--font-display)',
                fontSize: '0.55rem', letterSpacing: '0.1em',
                padding: '0.2rem 0.6rem', verticalAlign: 'middle',
              }}>
                {pendingCount} pending
              </span>
            )}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '0.6rem', fontSize: '0.95rem' }}>
            Review and approve or decline requests from players who found your public campaign page.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href={`/campaign/${slug}`} target="_blank" style={{ textDecoration: 'none' }}>
            <button className="btn-secondary" style={{ fontSize: '0.6rem' }}>View Public Page ↗</button>
          </Link>
          <Link href={`/c/${slug}/admin`} style={{ textDecoration: 'none' }}>
            <button className="btn-secondary" style={{ fontSize: '0.6rem' }}>← Admin</button>
          </Link>
        </div>
      </div>

      {/* Public link panel */}
      <div style={{
        padding: '1rem 1.5rem',
        background: 'var(--bg-deep)',
        border: '1px solid var(--border-dim)',
        marginBottom: '2.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem',
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: '0.52rem',
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--text-muted)', marginBottom: '0.3rem',
          }}>
            Share this link to attract players
          </div>
          <span style={{
            fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--text-secondary)',
          }}>
            /campaign/{slug}
          </span>
        </div>
        <Link href={`/campaign/${slug}`} target="_blank" style={{ textDecoration: 'none' }}>
          <button className="btn-secondary" style={{ fontSize: '0.6rem', padding: '0.35rem 0.85rem' }}>
            Open ↗
          </button>
        </Link>
      </div>

      {/* Requests list */}
      <RequestsList
        initialRequests={requests}
        campaignId={campaign.id}
        campaignSlug={slug}
      />

    </div>
  );
}
