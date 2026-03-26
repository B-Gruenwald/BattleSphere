import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Warzones',
  description: 'Organise and track narrative wargaming campaigns',
};

function NavBar() {
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
        Warzones
      </Link>

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
        {['Campaigns', 'Map', 'Dashboard'].map((label) => (
          <Link
            key={label}
            href={`/${label.toLowerCase()}`}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.65rem',
              fontWeight: '600',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
            }}
          >
            {label}
          </Link>
        ))}
        <Link href="/login">
          <button className="btn-secondary" style={{ padding: '0.5rem 1.25rem' }}>
            Log In
          </button>
        </Link>
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
          Warzones · Narrative Campaign Platform · Early Access
        </footer>
      </body>
    </html>
  );
}