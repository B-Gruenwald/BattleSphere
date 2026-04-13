import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/photos/army-unit
// Body: { unitId, url }
// Saves a Cloudinary URL to army_unit_photos.
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { unitId, url } = await request.json();
  if (!unitId || !url) {
    return NextResponse.json({ error: 'Missing unitId or url' }, { status: 400 });
  }

  // Verify the unit exists and the caller owns the parent army
  const admin = createAdminClient();
  const { data: unitRows } = await admin
    .from('army_units')
    .select('id, armies(player_id)')
    .eq('id', unitId)
    .limit(1);
  const unit = unitRows?.[0] ?? null;
  if (!unit) return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
  if (unit.armies?.player_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await admin
    .from('army_unit_photos')
    .insert({ unit_id: unitId, uploader_id: user.id, url })
    .select('*')
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ photo: data?.[0] ?? null });
}

// DELETE /api/photos/army-unit?id=<photoId>
// Removes a unit photo. Uploader or army owner only.
export async function DELETE(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const photoId = searchParams.get('id');
  if (!photoId) return NextResponse.json({ error: 'Missing photo id' }, { status: 400 });

  const admin = createAdminClient();

  const { data: photoRows } = await admin
    .from('army_unit_photos')
    .select('*, army_units(army_id, armies(player_id))')
    .eq('id', photoId)
    .limit(1);
  const photo = photoRows?.[0] ?? null;
  if (!photo) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const armyOwnerId = photo.army_units?.armies?.player_id;
  const canDelete = photo.uploader_id === user.id || armyOwnerId === user.id;
  if (!canDelete) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await admin.from('army_unit_photos').delete().eq('id', photoId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
