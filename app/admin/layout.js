import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Super Admin · BattleSphere',
};

export default async function AdminLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Check is_admin on the logged-in user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) redirect('/dashboard');

  const subNavLinkStyle = {
    fontFamily: 'var(--font-display)',
    fontSize: '0.6rem',
    fontWeight: '600',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--text-secondary)',
    textDecoration: 'none',
  };

  return (
    <div>
      {/* Admin sub-nav bar */}
      <div style={{
        background: 'rgba(180, 30, 30, 0.06)',
        borderBottom: '1px solid rgba(200, 60, 60, 0.25)',
        padding: '0.7rem 2rem',
        display: 'flex',
        gap: '2rem',
        alignItems: 'center',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.58rem',
          fontWeight: '700',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: '#e05a5a',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
        }}>
          ◆ Super Admin
        </span>
        <div style={{ width: '1px', height: '14px', background: 'rgba(200,60,60,0.3)' }} />
        <Link href="/admin" style={subNavLinkStyle}>Overview</Link>
        <Link href="/admin/users" style={subNavLinkStyle}>Users</Link>
        <Link href="/admin/battles" style={subNavLinkStyle}>Battles</Link>
        <Link href="/admin/send-onboarding" style={subNavLinkStyle}>Send Onboarding</Link>
      </div>

      {children}
    </div>
  );
}
