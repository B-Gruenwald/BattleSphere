/**
 * GET /api/battles/link-options?battleId=<uuid>
 *
 * Returns the campaigns that are eligible to receive a linked copy of this
 * battle, along with their territories and suggested factions.
 *
 * Eligibility rules:
 *  • The current user is one of the battle's players (attacker or defender).
 *  • The OTHER player in the battle is also a member of the target campaign.
 *  • The target campaign is different from the battle's own campaign.
 *  • The battle has not already been linked to this target campaign.
 *
 * Response shape:
 * {
 *   campaigns: [
 *     {
 *       id, name, slug,
 *       territories: [{ id, name, depth }],
 *       attackerFaction: { id, name, colour } | null,
 *       defenderFaction: { id, name, colour } | null,
 *     }
 *   ]
 * }
 */

import { createClient } from '@/lib/supabase/server';

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorised.' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const battleId = searchParams.get('battleId');
  if (!battleId) return Response.json({ error: 'battleId required.' }, { status: 400 });

  // Fetch the battle
  const { data: battle } = await supabase
    .from('battles')
    .select('*')
    .eq('id', battleId)
    .limit(1);
  const b = battle?.[0] ?? null;
  if (!b) return Response.json({ error: 'Battle not found.' }, { status: 404 });

  // Caller must be a participant
  const isAttacker = b.attacker_player_id === user.id;
  const isDefender = b.defender_player_id === user.id;
  if (!isAttacker && !isDefender) {
    return Response.json({ error: 'You are not a participant in this battle.' }, { status: 403 });
  }

  const otherPlayerId = isAttacker ? b.defender_player_id : b.attacker_player_id;

  // Battles already linked FROM this original (to avoid double-linking same campaign)
  const { data: linkedRows } = await supabase
    .from('battles')
    .select('campaign_id')
    .eq('source_battle_id', battleId);
  const alreadyLinkedCampaignIds = new Set((linkedRows || []).map(r => r.campaign_id));
  alreadyLinkedCampaignIds.add(b.campaign_id); // can't link to own campaign

  // Campaigns the current user is a member of
  const { data: myMemberships } = await supabase
    .from('campaign_members')
    .select('campaign_id, faction_id')
    .eq('user_id', user.id);

  const myCampaignIds = (myMemberships || [])
    .map(m => m.campaign_id)
    .filter(cid => !alreadyLinkedCampaignIds.has(cid));

  if (myCampaignIds.length === 0) return Response.json({ campaigns: [] });

  // If there's another player, check they're also in those campaigns
  let eligibleCampaignIds = myCampaignIds;
  let otherMemberships = [];

  if (otherPlayerId) {
    const { data: otherMem } = await supabase
      .from('campaign_members')
      .select('campaign_id, faction_id')
      .eq('user_id', otherPlayerId)
      .in('campaign_id', myCampaignIds);

    otherMemberships = otherMem || [];
    const otherCampaignIds = new Set(otherMemberships.map(m => m.campaign_id));
    eligibleCampaignIds = myCampaignIds.filter(cid => otherCampaignIds.has(cid));
  }

  if (eligibleCampaignIds.length === 0) return Response.json({ campaigns: [] });

  // Fetch campaign names + slugs
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name, slug')
    .in('id', eligibleCampaignIds);

  if (!campaigns || campaigns.length === 0) return Response.json({ campaigns: [] });

  // Fetch factions for all eligible campaigns
  const { data: allFactions } = await supabase
    .from('factions')
    .select('id, campaign_id, name, colour')
    .in('campaign_id', eligibleCampaignIds);

  const factionsByCampaign = {};
  for (const f of (allFactions || [])) {
    if (!factionsByCampaign[f.campaign_id]) factionsByCampaign[f.campaign_id] = [];
    factionsByCampaign[f.campaign_id].push(f);
  }

  // Fetch territories for all eligible campaigns
  const { data: allTerritories } = await supabase
    .from('territories')
    .select('id, campaign_id, name, depth')
    .in('campaign_id', eligibleCampaignIds)
    .order('depth')
    .order('name');

  const territoriesByCampaign = {};
  for (const t of (allTerritories || [])) {
    if (!territoriesByCampaign[t.campaign_id]) territoriesByCampaign[t.campaign_id] = [];
    territoriesByCampaign[t.campaign_id].push(t);
  }

  // Build membership faction lookups
  const myFactionByCampaign = Object.fromEntries(
    (myMemberships || []).map(m => [m.campaign_id, m.faction_id]),
  );
  const otherFactionByCampaign = Object.fromEntries(
    otherMemberships.map(m => [m.campaign_id, m.faction_id]),
  );

  // Compose response — preserve attacker/defender orientation
  const result = campaigns.map(camp => {
    const factions     = factionsByCampaign[camp.id]   ?? [];
    const territories  = territoriesByCampaign[camp.id] ?? [];
    const factionMap   = Object.fromEntries(factions.map(f => [f.id, f]));

    // Auto-suggest: current user's faction in this campaign
    const myFactionId    = myFactionByCampaign[camp.id];
    const otherFactionId = otherFactionByCampaign[camp.id];

    // Preserve attacker/defender: if caller is attacker in original, suggest attacker faction
    const attackerFaction = isAttacker
      ? (factionMap[myFactionId]    ?? null)
      : (factionMap[otherFactionId] ?? null);
    const defenderFaction = isAttacker
      ? (factionMap[otherFactionId] ?? null)
      : (factionMap[myFactionId]    ?? null);

    return {
      id: camp.id,
      name: camp.name,
      slug: camp.slug,
      factions,
      territories: territories.map(t => ({ id: t.id, name: t.name, depth: t.depth })),
      attackerFactionId: attackerFaction?.id ?? null,
      defenderFactionId: defenderFaction?.id ?? null,
    };
  });

  return Response.json({ campaigns: result });
}
