import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import AnnouncementsForm from './AnnouncementsForm';

export const metadata = {
  title: 'Platform Announcements · Admin · BattleSphere',
};

export default async function AnnouncementsPage() {
  // Auth check — super admin only
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).limit(1);
  if (!profile?.[0]?.is_admin) redirect('/dashboard');

  // Fetch existing announcements newest first
  const adminClient = createAdminClient();
  const { data: announcements } = await adminClient
    .from('platform_announcements')
    .select('*')
    .order('created_at', { ascending: false });

  // Count opted-in users (for context)
  const { count: optinCount } = await adminClient
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('optin_platform_news', true);

  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '760px', margin: '0 auto' }}>

      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2.5rem' }}>
        <Link href="/admin" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>
          Admin
        </Link>
        <span style={{ color: 'var(--border-dim)', fontSize: '0.8rem' }}>›</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Platform Announcements</span>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.58rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: '#e05a5a',
          marginBottom: '0.5rem',
        }}>
          Platform Administration
        </p>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
          Platform Announcements
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Queue an announcement for the platform newsletter section of the next digest.
          It will be included for all users with platform news opted in
          {optinCount != null ? ` (currently ${optinCount})` : ''}.
        </p>
      </div>

      <AnnouncementsForm
        announcements={announcements || []}
        authorId={user.id}
      />

      <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border-dim)' }}>
        <Link href="/admin">
          <button className="btn-secondary">← Back to Admin Overview</button>
        </Link>
      </div>
    </div>
  );
}
