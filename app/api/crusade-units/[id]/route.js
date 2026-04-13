import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Shared helper: resolve who may edit a crusade_unit_record
async function resolveAccess(admin, user, record) {
  if (record.player_id === user.id) return { isOwner: true, isOrganiser: false };

  // Check if user is the campaign organiser
  const { data: carRows } = await admin
    .from('campaign_army_records')
    .select('campaign_id')
    .eq('id', record.campaign_army_record_id)
    .limit(1);
  const campaignId = carRows?.[0]?.campaign_id;
  if (!campaignId) return { isOwner: false, isOrganiser: false };

  const { data: campRows } = await admin
    .from('campaigns')
    .select('organiser_id')
    .eq('id', campaignId)
    .limit(1);
  if (campRows?.[0]?.organiser_id === user.id) return { isOwner: false, isOrganiser: true };

  const { data: memberRows } = await admin
    .from('campaign_members')
    .select('role')
    .eq('campaign_id', campaignId)
    .eq('user_id', user.id)
    .limit(1);
  const isOrganiser = ['organiser', 'admin'].includes(memberRows?.[0]?.role);
  return { isOwner: false, isOrganiser };
}

// PUT /api/crusade-units/[id]
// Updates XP, Kills, CP, Upgrades, Scars. Owner or campaign organiser may do this.
export async function PUT(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const admin    = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: rows } = await admin
    .from('crusade_unit_records')
    .select('*')
    .eq('id', id)
    .limit(1);
  const record = rows?.[0] ?? null;
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { isOwner, isOrganiser } = await resolveAccess(admin, user, record);
  if (!isOwner && !isOrganiser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const allowed = ['experience_points', 'kills', 'crusade_points', 'upgrades', 'scars'];
  const updates = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await admin
    .from('crusade_unit_records')
    .update(updates)
    .eq('id', id)
    .select('*')
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ record: data?.[0] });
}

// DELETE /api/crusade-units/[id]
// Removes a unit from the Crusade force. Owner only.
export async function DELETE(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const admin    = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: rows } = await admin
    .from('crusade_unit_records')
    .select('*')
    .eq('id', id)
    .limit(1);
  const record = rows?.[0] ?? null;
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (record.player_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await admin
    .from('crusade_unit_records')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
