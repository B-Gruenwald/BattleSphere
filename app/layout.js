import './globals.css';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import NavBar from './components/NavBar';
import NewsletterOptinModal from './components/NewsletterOptinModal';
import { Analytics } from '@vercel/analytics/next';

export const metadata = {
  title: 'BattleSphere',
  description: 'Organise and track narrative wargaming campaigns',
};

async function NavBarServer() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    isAdmin = profile?.is_admin === true;
  }

  const username = user?.user_metadata?.username || user?.email || null;

  return <NavBar user={user} isAdmin={isAdmin} username={username} />;
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <NavBarServer />
        <NewsletterOptinModal />
        <main style={{ paddingTop: '64px' }}>
          {children}
        </main>
        <Analytics />
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
