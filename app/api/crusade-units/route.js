import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/crusade-units
// Enlists a unit from the army roster into the campaign's Crusade force.
export async function POST(request) {
  const supabase = await createClient();
  const admin    = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await request.json();
  const { campaign_army_record_id, army_unit_id } = body;
  if (!campaign_army_record_id || !army_unit_id) {
    return NextResponse.json({ error: 'campaign_army_record_id and army_unit_id are required' }, { status: 400 });
  }

  // Verify caller owns the campaign army record
  const { data: carRows } = await admin
    .from('campaign_army_records')
    .select('*')
    .eq('id', campaign_army_record_id)
    .eq('player_id', user.id)
    .limit(1);
  if (!carRows?.[0]) {
    return NextResponse.json({ error: 'Campaign army record not found or not yours' }, { status: 403 });
  }

  // Verify the unit belongs to the army linked by this record
  const { data: unitRows } = await admin
    .from('army_units')
    .select('*')
    .eq('id', army_unit_id)
    .eq('army_id', carRows[0].army_id)
    .limit(1);
  if (!unitRows?.[0]) {
    return NextResponse.json({ error: 'Unit not found in this army' }, { status: 403 });
  }

  const { data, error } = await admin
    .from('crusade_unit_records')
    .insert({
      campaign_army_record_id,
      army_unit_id,
      player_id: user.id,
    })
    .select('*')
    .limit(1);

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Unit already enlisted in this Crusade force' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ record: data?.[0] });
}
