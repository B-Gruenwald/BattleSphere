import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import StandaloneBattleForm from '@/app/components/StandaloneBattleForm';

export default async function NewStandaloneBattlePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '780px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{
          fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.2em',
          textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.5rem',
        }}>
          Personal Battle Log
        </p>
        <h1 style={{
          fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: '900',
          letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem',
        }}>
          Log a Battle
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          Record a battle outside of any campaign. All fields except result are optional.
        </p>
      </div>

      <div style={{ borderTop: '1px solid var(--border-dim)', marginBottom: '2.5rem' }} />

      <StandaloneBattleForm userId={user.id} />
    </div>
  );
}
