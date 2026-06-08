import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import NotificationBroadcastForm from './NotificationBroadcastForm';

export const metadata = {
  title: 'Send Notification · Admin · BattleSphere',
};

export default async function AdminNotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) redirect('/dashboard');

  const admin = createAdminClient();

  const [
    { data: campaigns },
    { count: totalUsers },
  ] = await Promise.all([
    admin.from('campaigns').select('id, name').order('name', { ascending: true }),
    admin.from('profiles').select('*', { count: 'exact', head: true }),
  ]);

  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '680px', margin: '0 auto' }}>

      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2.5rem' }}>
        <Link href="/admin" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>
          Admin
        </Link>
        <span style={{ color: 'var(--border-dim)', fontSize: '0.8rem' }}>›</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Send Notification</span>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
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
          Send Notification
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Push a message directly into users' notification bell and Inbox.
          Use this for announcements, feature launches, or campaign callouts.
        </p>
      </div>

      <NotificationBroadcastForm
        campaigns={campaigns || []}
        totalUsers={totalUsers ?? 0}
      />

      <div style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid var(--border-dim)' }}>
        <Link href="/admin">
          <button className="btn-secondary">← Back to Admin Overview</button>
        </Link>
      </div>
    </div>
  );
}
