import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const username = user.user_metadata?.username || user.email;

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <p style={{
        fontFamily: 'var(--font-display)',
        fontSize: '0.65rem',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: 'var(--text-gold)',
        marginBottom: '1rem',
      }}>
        Commander Overview
      </p>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
        Welcome, {username}
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '3rem' }}>
        Your campaigns, battle records, and faction status will appear here.
      </p>

      {/* Placeholder campaign area */}
      <div style={{
        border: '1px solid var(--border-dim)',
        padding: '3rem',
        textAlign: 'center',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <div style={{
          width: '8px', height: '8px',
          background: 'var(--gold)',
          transform: 'rotate(45deg)',
          margin: '0 auto 1.5rem',
          opacity: 0.4,
        }} />
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.65rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--text-gold)',
          marginBottom: '0.75rem',
        }}>
          No campaigns yet
        </p>
        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.95rem' }}>
          Campaign creation is coming in the next build phase.
        </p>
      </div>
    </div>
  );
}
