import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import ProfileSettingsForm from './ProfileSettingsForm';

export const metadata = {
  title: 'Profile Settings · BattleSphere',
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/profile');

  const { data: profileRows } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .limit(1);
  const profile = profileRows?.[0] ?? null;

  const username = profile?.username || user.user_metadata?.username || user.email;

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '680px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '3rem' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.5rem' }}>
          Settings
        </p>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>{username}</h1>
        <Link
          href={`/players/${encodeURIComponent(username)}`}
          style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', textDecoration: 'none' }}
        >
          View public profile →
        </Link>
      </div>

      {/* Privacy */}
      <ProfileSettingsForm profile={profile} username={username} />

      {/* Other settings links */}
      <div style={{ marginTop: '3rem', borderTop: '1px solid var(--border-dim)', paddingTop: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '1.25rem' }}>
          More Settings
        </h2>
        <Link href="/profile/notifications" style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid var(--border-dim)', cursor: 'pointer' }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>Notification Preferences</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Newsletter subscriptions, campaign digests, email alerts</div>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>›</span>
          </div>
        </Link>
      </div>

    </div>
  );
}
