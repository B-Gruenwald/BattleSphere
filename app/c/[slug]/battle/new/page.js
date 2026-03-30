import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import BattleLogForm from '@/app/components/BattleLogForm';

export default async function NewBattlePage({ params, searchParams }) {
  const { slug } = await params;
  const { territory: preselectedTerritoryId } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!campaign) notFound();

  // Use select('*') — specific column selection fails if schema has missing columns
  const { data: territories } = await supabase
    .from('territories')
    .select('*')
    .eq('campaign_id', campaign.id)
    .order('depth')
    .order('name');

  const { data: factions } = await supabase
    .from('factions')
    .select('*')
    .eq('campaign_id', campaign.id)
    .order('created_at');

  // Fetch campaign members
  const { data: campaignMembers } = await supabase
    .from('campaign_members')
    .select('user_id, faction_id')
    .eq('campaign_id', campaign.id);

  // Fetch profiles for those members
  const memberIds = (campaignMembers || []).map(m => m.user_id);
  const { data: profiles } = memberIds.length > 0
    ? await supabase.from('profiles').select('id, username').in('id', memberIds)
    : { data: [] };

  // Merge members with their usernames and faction assignments
  const members = (campaignMembers || []).map(m => ({
    user_id:    m.user_id,
    faction_id: m.faction_id || null,
    username:   profiles?.find(p => p.id === m.user_id)?.username ?? 'Unknown',
  }));

  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '780px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.6rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--text-gold)',
          marginBottom: '0.5rem',
        }}>
          {campaign.name}
        </p>
        <h1 style={{
          fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
          fontWeight: '900',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: '0.75rem',
        }}>
          Log a Battle
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          Record the outcome. Attacker player is required — defender is optional for solo raids.
        </p>
      </div>

      <div style={{ borderTop: '1px solid var(--border-dim)', marginBottom: '2.5rem' }} />

      <BattleLogForm
        campaign={campaign}
        territories={territories || []}
        factions={factions || []}
        members={members}
        userId={user.id}
        preselectedTerritoryId={preselectedTerritoryId || ''}
      />
    </div>
  );
}
