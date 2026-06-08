import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import ForcesClient from './ForcesClient';

export default async function MyForcesPage({ params }) {
  const { slug } = await params;
  const supabase = await createClient();
  const admin    = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/c/${slug}`);

  // Campaign
  const { data: campaignRows } = await admin
    .from('campaigns').select('*').eq('slug', slug).limit(1);
  const campaign = campaignRows?.[0] ?? null;
  if (!campaign) notFound();

  // Must be a member
  const { data: memberRows } = await admin
    .from('campaign_members').select('role, faction_id')
    .eq('campaign_id', campaign.id).eq('user_id', user.id).limit(1);
  const membership = memberRows?.[0] ?? null;
  if (!membership) redirect(`/campaign/${slug}`);

  // Campaign factions (for faction picker on deploy)
  const { data: factions } = await admin
    .from('factions').select('id, name, colour')
    .eq('campaign_id', campaign.id).order('created_at');

  // Armies already deployed by this player to this campaign
  const { data: records } = await admin
    .from('campaign_army_records')
    .select('*')
    .eq('campaign_id', campaign.id)
    .eq('player_id', user.id)
    .order('created_at', { ascending: true });

  const deployedArmyIds = (records || []).map(r => r.army_id);

  // Enrich records with army details + faction details
  let armyMap = {};
  if (deployedArmyIds.length) {
    const { data: armies } = await admin
      .from('armies').select('id, name, faction_name, game_system, cover_image_url, is_public')
      .in('id', deployedArmyIds);
    armyMap = Object.fromEntries((armies || []).map(a => [a.id, a]));
  }

  const factionMap = Object.fromEntries((factions || []).map(f => [f.id, f]));

  const enrichedRecords = (records || []).map(r => ({
    ...r,
    army:    armyMap[r.army_id]    ?? null,
    faction: r.faction_id ? (factionMap[r.faction_id] ?? null) : null,
  }));

  // All player's armies (for the deploy modal — show all, mark deployed ones)
  const { data: allPlayerArmies } = await admin
    .from('armies').select('id, name, faction_name, game_system, cover_image_url')
    .eq('player_id', user.id)
    .order('created_at', { ascending: true });

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
      <ForcesClient
        campaign={campaign}
        records={enrichedRecords}
        allPlayerArmies={allPlayerArmies || []}
        factions={factions || []}
        userId={user.id}
      />
    </div>
  );
}
