import './globals.css';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import LogoutButton from './components/LogoutButton';

export const metadata = {
  title: 'BattleSphere',
  description: 'Organise and track narrative wargaming campaigns',
};

const navLinkStyle = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.65rem',
  fontWeight: '600',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
  textDecoration: 'none',
};

async function NavBar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Check for admin flag on the logged-in user's profile
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    isAdmin = profile?.is_admin === true;
  }

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      height: '64px',
      background: 'linear-gradient(180deg, rgba(10,10,15,0.98) 0%, rgba(10,10,15,0.92) 100%)',
      borderBottom: '1px solid var(--border-dim)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 2rem',
      justifyContent: 'space-between',
    }}>
      <Link href="/" style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.1rem',
        fontWeight: '700',
        letterSpacing: '0.2em',
        color: 'var(--gold)',
        textTransform: 'uppercase',
        textDecoration: 'none',
      }}>
        BattleSphere
      </Link>

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
        {user ? (
          <>
            <Link href="/dashboard" style={navLinkStyle}>Dashboard</Link>
            {isAdmin && (
              <Link href="/admin" style={{ ...navLinkStyle, color: '#e05a5a' }}>Admin</Link>
            )}
            <span style={{ ...navLinkStyle, opacity: 0.5 }}>
              {user.user_metadata?.username || user.email}
            </span>
            <LogoutButton />
          </>
        ) : (
          <>
            <Link href="/register" style={navLinkStyle}>Register</Link>
            <Link href="/login">
              <button className="btn-secondary" style={{ padding: '0.5rem 1.25rem' }}>Log In</button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        <main style={{ paddingTop: '64px' }}>
          {children}
        </main>
        <footer style={{
          borderTop: '1px solid var(--border-dim)',
          padding: '2rem',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-display)',
          fontSize: '0.6rem',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
        }}>
          <div>BattleSphere · Narrative Campaign Platform · Early Access</div>
          <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'center', gap: '2rem' }}>
            <Link href="/privacy-policy" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
              Privacy Policy
            </Link>
            <Link href="/impressum" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
              Legal Notice
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
