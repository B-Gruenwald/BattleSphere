import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/campaign-army-records/[id]
// Returns a single record enriched with army + faction + units + crusade_unit_records.
export async function GET(request, { params }) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: rows } = await admin
    .from('campaign_army_records')
    .select('*')
    .eq('id', id)
    .limit(1);
  const record = rows?.[0] ?? null;
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Army details
  const { data: armyRows } = await admin.from('armies').select('*').eq('id', record.army_id).limit(1);
  const army = armyRows?.[0] ?? null;

  // Units for this army (ordered)
  const { data: units } = await admin
    .from('army_units')
    .select('*')
    .eq('army_id', record.army_id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  // Crusade unit records for this campaign army
  const { data: crusadeRecords } = await admin
    .from('crusade_unit_records')
    .select('*')
    .eq('campaign_army_record_id', id);
  const crusadeByUnit = Object.fromEntries(
    (crusadeRecords || []).map(r => [r.army_unit_id, r])
  );

  // Campaign faction
  let faction = null;
  if (record.faction_id) {
    const { data: factionRows } = await admin.from('factions').select('id, name, colour').eq('id', record.faction_id).limit(1);
    faction = factionRows?.[0] ?? null;
  }

  // Campaign name
  const { data: campaignRows } = await admin.from('campaigns').select('name, slug').eq('id', record.campaign_id).limit(1);
  const campaign = campaignRows?.[0] ?? null;

  return NextResponse.json({
    record: { ...record, army, faction, campaign },
    units: (units || []).map(u => ({ ...u, crusade: crusadeByUnit[u.id] ?? null })),
  });
}

// PUT /api/campaign-army-records/[id]
// Updates Crusade stats and campaign notes. Record owner OR campaign organiser may do this.
export async function PUT(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const admin    = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  // Fetch record
  const { data: existing } = await admin
    .from('campaign_army_records')
    .select('*')
    .eq('id', id)
    .limit(1);
  const record = existing?.[0] ?? null;
  if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

  // Allow if: owner, campaign organiser_id, or organiser/admin member role
  const isOwner = record.player_id === user.id;
  let isOrganiser = false;
  if (!isOwner) {
    const { data: campaignRows } = await admin
      .from('campaigns')
      .select('organiser_id')
      .eq('id', record.campaign_id)
      .limit(1);
    isOrganiser = campaignRows?.[0]?.organiser_id === user.id;
    if (!isOrganiser) {
      const { data: memberRows } = await admin
        .from('campaign_members')
        .select('role')
        .eq('campaign_id', record.campaign_id)
        .eq('user_id', user.id)
        .limit(1);
      isOrganiser = ['organiser', 'admin'].includes(memberRows?.[0]?.role);
    }
  }
  if (!isOwner && !isOrganiser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const allowed = [
    'campaign_notes',
    'crusade_points',
    'supply_limit',
    'supply_used',
    'battles_played',
    'battles_won',
    'requisition_points',
    'scars_and_upgrades',
    'faction_id',
    'kt_spec_ops_note',
    'kt_equipment_points',
  ];
  const updates = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await admin
    .from('campaign_army_records')
    .update(updates)
    .eq('id', id)
    .select('*')
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ record: data?.[0] });
}

// DELETE /api/campaign-army-records/[id]
// Unlinks the army from the campaign. Only the record owner may do this.
export async function DELETE(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const admin    = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: existing } = await admin
    .from('campaign_army_records')
    .select('*')
    .eq('id', id)
    .limit(1);
  const record = existing?.[0] ?? null;
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (record.player_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await admin
    .from('campaign_army_records')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
