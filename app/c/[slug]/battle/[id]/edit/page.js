import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import BattleEditForm from '@/app/components/BattleEditForm';

export default async function EditBattlePage({ params }) {
  const { slug, id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!campaign) notFound();

  // Must be a campaign member to reach this page at all
  const { data: membership } = await supabase
    .from('campaign_members')
    .select('role')
    .eq('campaign_id', campaign.id)
    .eq('user_id', user.id)
    .single();

  if (!membership) redirect(`/c/${slug}`);

  const { data: battle } = await supabase
    .from('battles')
    .select('*')
    .eq('id', id)
    .eq('campaign_id', campaign.id)
    .single();

  if (!battle) notFound();

  // Co-ownership check: only the logger, the attacker, the defender,
  // or the campaign organiser may edit a battle record.
  const isCoOwner =
    user.id === battle.logged_by             ||
    user.id === battle.attacker_player_id    ||
    user.id === battle.defender_player_id    ||
    user.id === campaign.organiser_id;

  if (!isCoOwner) redirect(`/c/${slug}/battle/${id}`);

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

  const { data: campaignMembers } = await supabase
    .from('campaign_members')
    .select('user_id, faction_id')
    .eq('campaign_id', campaign.id);

  const memberIds = (campaignMembers || []).map(m => m.user_id);
  const { data: profiles } = memberIds.length > 0
    ? await supabase.from('profiles').select('id, username').in('id', memberIds)
    : { data: [] };

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
          {campaign.name} · Battle Record
        </p>
        <h1 style={{
          fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
          fontWeight: '900',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: '0.75rem',
        }}>
          Edit Battle
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          Correct the record — both players and the organiser can amend battle details.
        </p>
      </div>

      <div style={{ borderTop: '1px solid var(--border-dim)', marginBottom: '2.5rem' }} />

      <BattleEditForm
        battle={battle}
        campaign={campaign}
        territories={territories || []}
        factions={factions || []}
        members={members}
      />
    </div>
  );
}
