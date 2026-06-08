import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import RosterManagerClient from './RosterManagerClient';

export default async function ArmyRosterPage({ params }) {
  const { slug, armyId } = await params;
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

  // Campaign army record for this army in this campaign
  const { data: recordRows } = await admin
    .from('campaign_army_records')
    .select('*')
    .eq('campaign_id', campaign.id)
    .eq('army_id', armyId)
    .limit(1);
  const record = recordRows?.[0] ?? null;
  if (!record) notFound();

  // Army
  const { data: armyRows } = await admin
    .from('armies').select('*').eq('id', armyId).limit(1);
  const army = armyRows?.[0] ?? null;
  if (!army) notFound();

  // Is this the army owner (or organiser)?
  const isOwner = record.player_id === user.id;
  const isOrganiser = campaign.organiser_id === user.id
    || ['organiser', 'admin'].includes(membership?.role);
  const canEdit = isOwner || isOrganiser;

  // Campaign factions
  const { data: factions } = await admin
    .from('factions').select('id, name, colour')
    .eq('campaign_id', campaign.id).order('created_at');

  // Army faction in this campaign
  const campaignFaction = (factions || []).find(f => f.id === record.faction_id) ?? null;

  // Units for this army (ordered)
  const { data: units } = await admin
    .from('army_units')
    .select('*')
    .eq('army_id', armyId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  // Crusade unit records for this campaign army record
  const { data: crusadeUnits } = await admin
    .from('crusade_unit_records')
    .select('*')
    .eq('campaign_army_record_id', record.id);

  // Battle history: battles in this campaign where army_id_p1 or army_id_p2 = armyId
  const { data: battles } = await admin
    .from('battles')
    .select('id, headline, created_at, attacker_faction_id, defender_faction_id, winner_faction_id, attacker_player_id, defender_player_id, army_id_p1, army_id_p2, territory_id')
    .eq('campaign_id', campaign.id)
    .or(`army_id_p1.eq.${armyId},army_id_p2.eq.${armyId}`)
    .order('created_at', { ascending: false });

  // Enrich battles with faction + territory names
  const factionMap = Object.fromEntries((factions || []).map(f => [f.id, f]));
  const { data: territories } = await admin
    .from('territories').select('id, name').eq('campaign_id', campaign.id);
  const territoryMap = Object.fromEntries((territories || []).map(t => [t.id, t]));

  const enrichedBattles = (battles || []).map(b => ({
    ...b,
    attackerFaction: factionMap[b.attacker_faction_id] ?? null,
    defenderFaction: factionMap[b.defender_faction_id] ?? null,
    winnerFaction:   factionMap[b.winner_faction_id]   ?? null,
    territory:       territoryMap[b.territory_id]       ?? null,
  }));

  // Owner's profile for the "this army belongs to" reference
  const { data: ownerRows } = await admin
    .from('profiles').select('id, username').eq('id', record.player_id).limit(1);
  const ownerProfile = ownerRows?.[0] ?? null;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <Link href={`/c/${slug}`} style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textDecoration: 'none' }}>
          {campaign.name}
        </Link>
        <span style={{ color: 'var(--border-dim)', fontSize: '0.75rem' }}>›</span>
        <Link href={`/c/${slug}/forces`} style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textDecoration: 'none' }}>
          My Forces
        </Link>
        <span style={{ color: 'var(--border-dim)', fontSize: '0.75rem' }}>›</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{army.name}</span>
      </nav>

      <RosterManagerClient
        campaign={campaign}
        army={army}
        record={record}
        campaignFaction={campaignFaction}
        factions={factions || []}
        units={units || []}
        crusadeUnits={crusadeUnits || []}
        battles={enrichedBattles}
        canEdit={canEdit}
        isOwner={isOwner}
        ownerProfile={ownerProfile}
      />
    </div>
  );
}
