import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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
