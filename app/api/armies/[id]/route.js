import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// PUT /api/armies/[id]
// Body: any subset of { name, game_system, faction_name, tagline, backstory, cover_image_url }
// Updates the army. Only the owner may do this.
export async function PUT(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  // Ownership check
  const { data: rows } = await admin
    .from('armies')
    .select('player_id')
    .eq('id', id)
    .limit(1);
  const army = rows?.[0] ?? null;
  if (!army)                       return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (army.player_id !== user.id)  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const updates = { updated_at: new Date().toISOString() };

  if (body.name            !== undefined) updates.name            = body.name?.trim()         || null;
  if (body.game_system     !== undefined) updates.game_system     = body.game_system?.trim()  || null;
  if (body.faction_name    !== undefined) updates.faction_name    = body.faction_name?.trim() || null;
  if (body.tagline         !== undefined) updates.tagline         = body.tagline?.trim()      || null;
  if (body.backstory       !== undefined) updates.backstory       = body.backstory?.trim()    || null;
  if (body.cover_image_url  !== undefined) updates.cover_image_url  = body.cover_image_url      || null;
  if (body.cover_focal_point !== undefined) updates.cover_focal_point = body.cover_focal_point || 'center';

  const { data, error } = await admin
    .from('armies')
    .update(updates)
    .eq('id', id)
    .select('*')
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ army: data?.[0] ?? null });
}

// DELETE /api/armies/[id]
// Deletes the army (cascade removes units + photos). Owner only.
export async function DELETE(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  const { data: rows } = await admin
    .from('armies')
    .select('player_id')
    .eq('id', id)
    .limit(1);
  const army = rows?.[0] ?? null;
  if (!army)                       return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (army.player_id !== user.id)  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await admin.from('armies').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
