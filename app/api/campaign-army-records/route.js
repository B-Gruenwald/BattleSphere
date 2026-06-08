import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/campaign-army-records?campaign_id=&player_id=
// Returns all campaign army records for a given campaign, optionally filtered by player.
// Joined with army name, faction_name, game_system, cover_image_url.
export async function GET(request) {
  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);
  const campaign_id = searchParams.get('campaign_id');
  const player_id   = searchParams.get('player_id');

  if (!campaign_id) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 });

  let query = admin
    .from('campaign_army_records')
    .select('*')
    .eq('campaign_id', campaign_id)
    .order('created_at', { ascending: true });

  if (player_id) query = query.eq('player_id', player_id);

  const { data: records, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!records?.length) return NextResponse.json({ records: [] });

  // Enrich with army details
  const armyIds = [...new Set(records.map(r => r.army_id))];
  const { data: armies } = await admin
    .from('armies')
    .select('id, name, faction_name, game_system, cover_image_url')
    .in('id', armyIds);
  const armyMap = Object.fromEntries((armies || []).map(a => [a.id, a]));

  // Enrich with campaign faction details
  const factionIds = [...new Set(records.map(r => r.faction_id).filter(Boolean))];
  const factionMap = {};
  if (factionIds.length) {
    const { data: factions } = await admin
      .from('factions')
      .select('id, name, colour')
      .in('id', factionIds);
    for (const f of factions || []) factionMap[f.id] = f;
  }

  const enriched = records.map(r => ({
    ...r,
    army: armyMap[r.army_id] ?? null,
    faction: r.faction_id ? (factionMap[r.faction_id] ?? null) : null,
  }));

  return NextResponse.json({ records: enriched });
}

// POST /api/campaign-army-records
// Links an army to a campaign. Caller must be a member of the campaign and own the army.
export async function POST(request) {
  const supabase = await createClient();
  const admin    = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await request.json();
  const { campaign_id, army_id } = body;

  if (!campaign_id || !army_id) {
    return NextResponse.json({ error: 'campaign_id and army_id are required' }, { status: 400 });
  }

  // Verify caller is a member of the campaign
  const { data: memberRows } = await admin
    .from('campaign_members')
    .select('*')
    .eq('campaign_id', campaign_id)
    .eq('user_id', user.id)
    .limit(1);
  if (!memberRows?.[0]) {
    return NextResponse.json({ error: 'You are not a member of this campaign' }, { status: 403 });
  }

  // Verify caller owns the army
  const { data: armyRows } = await admin
    .from('armies')
    .select('*')
    .eq('id', army_id)
    .eq('player_id', user.id)
    .limit(1);
  if (!armyRows?.[0]) {
    return NextResponse.json({ error: 'Army not found or not yours' }, { status: 403 });
  }

  // Insert record (unique constraint prevents duplicates)
  const { data, error } = await admin
    .from('campaign_army_records')
    .insert({ campaign_id, army_id, player_id: user.id })
    .select('*')
    .limit(1);

  if (error) {
    // unique violation — army already linked
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This army is already linked to this campaign' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ record: data?.[0] });
}
