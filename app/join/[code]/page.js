import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function JoinCampaignPage({ params }) {
  const { code } = await params;
  const supabase = await createClient();

  // Must be logged in
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirect=/join/${code}`);
  }

  // Look up campaign by invite code
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('invite_code', code)
    .single();

  // Invalid code — show error page
  if (!campaign) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}>
        <div style={{ textAlign: 'center', maxWidth: '420px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '2rem', opacity: 0.4 }}>
            <div style={{ width: '40px', height: '1px', background: 'var(--gold)' }} />
            <div style={{ width: '6px', height: '6px', background: 'var(--gold)', transform: 'rotate(45deg)' }} />
            <div style={{ width: '40px', height: '1px', background: 'var(--gold)' }} />
          </div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '1rem' }}>
            Invite Link
          </p>
          <h1 style={{ fontSize: '2rem', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1rem' }}>
            Link Not Found
          </h1>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2rem' }}>
            This invite link is invalid or has expired. Ask your campaign organiser for a new one.
          </p>
          <Link href="/dashboard">
            <button className="btn-primary">Go to Dashboard</button>
          </Link>
        </div>
      </div>
    );
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from('campaign_members')
    .select('user_id')
    .eq('campaign_id', campaign.id)
    .eq('user_id', user.id)
    .single();

  // Already a member — just send them to the campaign
  if (existing) {
    redirect(`/c/${campaign.slug}`);
  }

  // Join the campaign
  const { error: joinError } = await supabase
    .from('campaign_members')
    .insert({ campaign_id: campaign.id, user_id: user.id, role: 'player' });

  if (joinError) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}>
        <div style={{ textAlign: 'center', maxWidth: '420px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '2rem', opacity: 0.4 }}>
            <div style={{ width: '40px', height: '1px', background: 'var(--gold)' }} />
            <div style={{ width: '6px', height: '6px', background: 'var(--gold)', transform: 'rotate(45deg)' }} />
            <div style={{ width: '40px', height: '1px', background: 'var(--gold)' }} />
          </div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#e05a5a', marginBottom: '1rem' }}>
            Join Failed
          </p>
          <h1 style={{ fontSize: '2rem', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1rem' }}>
            Could Not Join
          </h1>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2rem', fontSize: '0.9rem' }}>
            {joinError.message}
          </p>
          <Link href="/dashboard">
            <button className="btn-secondary">Go to Dashboard</button>
          </Link>
        </div>
      </div>
    );
  }

  // Success — redirect to campaign
  redirect(`/c/${campaign.slug}`);
}
