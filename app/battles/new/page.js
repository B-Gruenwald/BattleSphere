import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import FreeBattleLogForm from '@/app/components/FreeBattleLogForm';

export default async function NewFreeBattlePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // My armies
  const { data: myArmies } = await supabase
    .from('armies')
    .select('id, name, faction_name, game_system')
    .eq('player_id', user.id)
    .order('created_at', { ascending: false });

  // All profiles for opponent selection
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, username')
    .order('username');

  const username = user.user_metadata?.username || user.email?.split('@')[0] || 'Player';

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '780px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.5rem' }}>
          Personal Battle Log
        </p>
        <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          Log a Battle
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          Recording a battle outside any campaign. Only the result is required — all other fields are optional.
        </p>
      </div>

      <div style={{ borderTop: '1px solid var(--border-dim)', marginBottom: '2.5rem' }} />

      <FreeBattleLogForm
        user={{ id: user.id, username }}
        myArmies={myArmies ?? []}
        allProfiles={allProfiles ?? []}
      />
    </div>
  );
}
