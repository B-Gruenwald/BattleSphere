import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import AdminCampaignSettings from '@/app/components/AdminCampaignSettings';
import OrganiserDigestMessage from '@/app/components/OrganiserDigestMessage';

export default async function AdminPage({ params }) {
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

  // Organiser only
  if (campaign.organiser_id !== user.id) redirect(`/c/${slug}`);

  // Fetch queued digest messages for this campaign
  const { data: digestMessages } = await supabase
    .from('campaign_digest_messages')
    .select('*')
    .eq('campaign_id', campaign.id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Fetch pending join request count (for the Join Requests section)
  const { count: pendingRequestCount } = await supabase
    .from('join_requests')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaign.id)
    .eq('status', 'pending');

  const isLeague = campaign.campaign_format === 'league';

  const sectionLabel = {
    fontFamily: 'var(--font-display)',
    fontSize: '0.6rem',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'var(--text-gold)',
    marginBottom: '0.5rem',
  };

  const sectionTitle = {
    fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
    fontWeight: '900',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: '0.6rem',
  };

  const sectionDesc = {
    color: 'var(--text-secondary)',
    fontSize: '0.88rem',
    lineHeight: 1.6,
    marginBottom: '2rem',
  };

  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '860px', margin: '0 auto' }}>

      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
        <Link href={`/c/${slug}`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>
          {campaign.name}
        </Link>
        <span style={{ color: 'var(--border-dim)', fontSize: '0.8rem' }}>›</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Admin</span>
      </nav>

      {/* Page header */}
      <div style={{ marginBottom: '3rem' }}>
        <p style={sectionLabel}>{campaign.name}</p>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Campaign Admin
        </h1>
      </div>

      {/* ═══ SECTION 1: Campaign Settings ═══════════════════════════════════ */}
      <div style={{ marginBottom: '3.5rem' }}>
        <div style={{ borderBottom: '1px solid var(--border-dim)', marginBottom: '2rem', paddingBottom: '0.75rem', display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
          <h2 style={sectionTitle}>General Settings</h2>
        </div>
        <p style={sectionDesc}>
          Edit your campaign's name, description, genre, visibility, influence mode, and Discord integration.
        </p>
        <AdminCampaignSettings campaign={campaign} slug={slug} />
      </div>

      {/* ═══ SECTION 2: Join Requests ═══════════════════════════════════════ */}
      <div style={{ marginBottom: '3.5rem' }}>
        <div style={{ borderBottom: '1px solid var(--border-dim)', marginBottom: '2rem', paddingBottom: '0.75rem', display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
          <h2 style={sectionTitle}>Join Requests</h2>
          {pendingRequestCount > 0 && (
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '0.52rem', letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--text-gold)',
              border: '1px solid rgba(183,140,64,0.4)', padding: '0.15rem 0.5rem',
            }}>
              {pendingRequestCount} pending
            </span>
          )}
        </div>
        <p style={sectionDesc}>
          Players who discover your public campaign page can request to join. Review and approve or decline their requests here.
        </p>
        <Link href={`/c/${slug}/requests`}>
          <button className="btn-primary">
            {pendingRequestCount > 0 ? `Review Requests (${pendingRequestCount} pending) →` : 'View Join Requests →'}
          </button>
        </Link>
      </div>

      {/* ═══ SECTION 3: Map (narrative only) ═══════════════════════════════ */}
      {!isLeague && (
        <div style={{ marginBottom: '3.5rem' }}>
          <div style={{ borderBottom: '1px solid var(--border-dim)', marginBottom: '2rem', paddingBottom: '0.75rem' }}>
            <h2 style={sectionTitle}>Campaign Map</h2>
          </div>
          <p style={sectionDesc}>
            Add, rename, or remove territories and sub-territories on your campaign map.
          </p>
          <Link href={`/c/${slug}/map/edit`}>
            <button className="btn-primary">Edit Campaign Map →</button>
          </Link>
        </div>
      )}

      {/* ═══ SECTION 4: Campaign Digest ════════════════════════════════════ */}
      <div style={{ marginBottom: '3.5rem' }}>
        <div style={{ borderBottom: '1px solid var(--border-dim)', marginBottom: '2rem', paddingBottom: '0.75rem' }}>
          <h2 style={sectionTitle}>Campaign Digest</h2>
        </div>
        <p style={sectionDesc}>
          Queue a short message for your subscribers — it will appear at the top of their next campaign digest, before bulletins and events.
        </p>
        <OrganiserDigestMessage
          campaignId={campaign.id}
          userId={user.id}
          initialMessages={digestMessages || []}
        />
      </div>

      {/* Back link */}
      <div style={{ marginTop: '1rem', paddingTop: '2rem', borderTop: '1px solid var(--border-dim)' }}>
        <Link href={`/c/${slug}`}>
          <button className="btn-secondary">← Back to Campaign Dashboard</button>
        </Link>
      </div>
    </div>
  );
}
