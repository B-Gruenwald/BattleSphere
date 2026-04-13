import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// PUT /api/army-units/[id]
// Body: any subset of { name, unit_type, description, sort_order }
// Updates a unit. Owner of the parent army only.
export async function PUT(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  // Fetch unit + its army to verify ownership
  const { data: unitRows } = await admin
    .from('army_units')
    .select('*, armies(player_id)')
    .eq('id', id)
    .limit(1);
  const unit = unitRows?.[0] ?? null;
  if (!unit) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (unit.armies?.player_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const updates = {};
  if (body.name        !== undefined) updates.name        = body.name?.trim()        || null;
  if (body.unit_type   !== undefined) updates.unit_type   = body.unit_type?.trim()   || null;
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.sort_order  !== undefined) updates.sort_order  = body.sort_order;

  const { data, error } = await admin
    .from('army_units')
    .update(updates)
    .eq('id', id)
    .select('*')
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ unit: data?.[0] ?? null });
}

// DELETE /api/army-units/[id]
// Deletes the unit (cascade removes its photos). Army owner only.
export async function DELETE(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  const { data: unitRows } = await admin
    .from('army_units')
    .select('*, armies(player_id)')
    .eq('id', id)
    .limit(1);
  const unit = unitRows?.[0] ?? null;
  if (!unit) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (unit.armies?.player_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await admin.from('army_units').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
