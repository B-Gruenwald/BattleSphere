import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import StandaloneBattleForm from '@/app/components/StandaloneBattleForm';

export default async function EditStandaloneBattlePage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: battle } = await supabase
    .from('standalone_battles')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!battle) notFound();

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '780px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{
          fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.2em',
          textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.5rem',
        }}>
          Personal Battle Log · Edit
        </p>
        <h1 style={{
          fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: '900',
          letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem',
        }}>
          Edit Battle
        </h1>
      </div>

      <div style={{ borderTop: '1px solid var(--border-dim)', marginBottom: '2.5rem' }} />

      <StandaloneBattleForm battle={battle} userId={user.id} />
    </div>
  );
}
