import './globals.css';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import NavBar from './components/NavBar';
import NewsletterOptinModal from './components/NewsletterOptinModal';
import { Analytics } from '@vercel/analytics/next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://battlesphere.cc';

const SITE_TITLE       = 'BattleSphere — Warhammer 40k & Age of Sigmar Campaign Tracker';
const SITE_DESCRIPTION = 'Free narrative campaign platform for Warhammer 40,000, Age of Sigmar, and tabletop wargaming. Track Crusade rosters, run map-based campaigns, log battles, and showcase your painted armies.';

export const metadata = {
  title: {
    default:  SITE_TITLE,
    template: '%s · BattleSphere',
  },
  description: SITE_DESCRIPTION,
  metadataBase: new URL(APP_URL),
  openGraph: {
    title:       SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName:    'BattleSphere',
    type:        'website',
    images: [{ url: `${APP_URL}/opengraph-image`, width: 800, height: 419 }],
  },
  twitter: {
    card:        'summary_large_image',
    title:       SITE_TITLE,
    description: SITE_DESCRIPTION,
    images:      [`${APP_URL}/opengraph-image`],
  },
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
