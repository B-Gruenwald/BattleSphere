import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div>
      {/* Hero */}
      <section style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '6rem 2rem 3rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background texture */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            radial-gradient(ellipse 80% 60% at 50% 40%, rgba(183, 140, 64, 0.04) 0%, transparent 70%),
            radial-gradient(ellipse 40% 40% at 20% 80%, rgba(139, 26, 26, 0.06) 0%, transparent 60%),
            radial-gradient(ellipse 30% 30% at 80% 20%, rgba(139, 26, 26, 0.04) 0%, transparent 60%)
          `,
          pointerEvents: 'none',
        }} />

        {/* Decorative rule */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', opacity: 0.5 }}>
          <div style={{ width: '60px', height: '1px', background: 'var(--gold)' }} />
          <div style={{ width: '6px', height: '6px', background: 'var(--gold)', transform: 'rotate(45deg)' }} />
          <div style={{ width: '60px', height: '1px', background: 'var(--gold)' }} />
        </div>

        <h1 style={{
          fontSize: 'clamp(3rem, 8vw, 6.5rem)',
          fontWeight: '900',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '1.5rem',
          background: 'linear-gradient(180deg, var(--text-primary) 0%, var(--gold-dim) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          lineHeight: 1.05,
        }}>
          Warzones
        </h1>

        <p style={{
          fontSize: 'clamp(1.1rem, 2.5vw, 1.35rem)',
          fontStyle: 'italic',
          color: 'var(--text-secondary)',
          maxWidth: '580px',
          marginBottom: '2.5rem',
          lineHeight: 1.6,
        }}>
          Organise your narrative wargaming campaigns. Track territory, tell stories, build legend.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {user ? (
            <Link href="/dashboard">
              <button className="btn-primary">Go to Dashboard</button>
            </Link>
          ) : (
            <>
              <Link href="/campaign/new">
                <button className="btn-primary">Begin Campaign</button>
              </Link>
              <Link href="/login">
                <button className="btn-secondary">Sign In</button>
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Feature strip */}
      <section style={{
        borderTop: '1px solid var(--border-dim)',
        borderBottom: '1px solid var(--border-dim)',
        padding: '3rem 2rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '0',
        maxWidth: '960px',
        margin: '0 auto',
      }}>
        {[
          { title: 'Campaign Maps',   body: 'Generate and customise interactive territory maps for any setting or scale.' },
          { title: 'Battle Records',  body: 'Log every engagement, track outcomes, and watch territorial influence shift.' },
          { title: 'Living Narrative', body: 'Chronicle your campaign story as it unfolds — missions, events, legend.' },
          { title: 'Faction Glory',   body: 'Achievements, rankings, and legacy tracking across every campaign season.' },
        ].map((f, i) => (
          <div key={i} style={{ padding: '2.5rem 2rem', borderRight: i < 3 ? '1px solid var(--border-dim)' : 'none', textAlign: 'center' }}>
            <div style={{ width: '8px', height: '8px', background: 'var(--gold)', transform: 'rotate(45deg)', margin: '0 auto 1.25rem', opacity: 0.6 }} />
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.75rem' }}>
              {f.title}
            </h3>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.65, fontStyle: 'italic' }}>
              {f.body}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
