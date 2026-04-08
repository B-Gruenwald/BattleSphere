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

  // ── Look up the invite code (new system: campaign_invite_codes table) ──────
  //   The table has a public SELECT policy so this works for any authenticated user.
  const { data: inviteRow } = await supabase
    .from('campaign_invite_codes')
    .select('*, campaigns(*)')
    .eq('code', code)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  // Invalid or expired code — show clear error
  if (!inviteRow || !inviteRow.campaigns) {
    return <InvalidLinkPage expired={!!inviteRow} />;
  }

  const campaign = inviteRow.campaigns;

  // Check if already a member — redirect straight to campaign
  const { data: existing } = await supabase
    .from('campaign_members')
    .select('user_id')
    .eq('campaign_id', campaign.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    redirect(`/c/${campaign.slug}`);
  }

  // ── Join ──────────────────────────────────────────────────────────────────
  const { error: joinError } = await supabase
    .from('campaign_members')
    .insert({ campaign_id: campaign.id, user_id: user.id, role: 'player' });

  if (joinError) {
    return <JoinErrorPage message={joinError.message} />;
  }

  // Success
  redirect(`/c/${campaign.slug}`);
}

// ─── Error UIs ────────────────────────────────────────────────────────────────

function InvalidLinkPage({ expired }) {
  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '420px' }}>
        <Ornament />
        <p style={{
          fontFamily: 'var(--font-display)', fontSize: '0.65rem',
          letterSpacing: '0.2em', textTransform: 'uppercase',
          color: 'var(--text-gold)', marginBottom: '1rem',
        }}>
          Invite Link
        </p>
        <h1 style={{ fontSize: '2rem', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          {expired ? 'Link Expired' : 'Link Not Found'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2rem' }}>
          {expired
            ? 'This invite link has expired. Ask your campaign organiser to generate a new one.'
            : 'This invite link is invalid or has already been revoked. Ask your campaign organiser for a new one.'}
        </p>
        <Link href="/dashboard">
          <button className="btn-primary">Go to Dashboard</button>
        </Link>
      </div>
    </div>
  );
}

function JoinErrorPage({ message }) {
  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '420px' }}>
        <Ornament />
        <p style={{
          fontFamily: 'var(--font-display)', fontSize: '0.65rem',
          letterSpacing: '0.2em', textTransform: 'uppercase',
          color: '#e05a5a', marginBottom: '1rem',
        }}>
          Join Failed
        </p>
        <h1 style={{ fontSize: '2rem', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          Could Not Join
        </h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2rem', fontSize: '0.9rem' }}>
          {message}
        </p>
        <Link href="/dashboard">
          <button className="btn-secondary">Go to Dashboard</button>
        </Link>
      </div>
    </div>
  );
}

function Ornament() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '2rem', opacity: 0.4 }}>
      <div style={{ width: '40px', height: '1px', background: 'var(--gold)' }} />
      <div style={{ width: '6px', height: '6px', background: 'var(--gold)', transform: 'rotate(45deg)' }} />
      <div style={{ width: '40px', height: '1px', background: 'var(--gold)' }} />
    </div>
  );
}
