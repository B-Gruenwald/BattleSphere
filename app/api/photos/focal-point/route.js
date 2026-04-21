import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const VALID_FOCAL_POINTS = ['top', 'center', 'bottom'];

// PATCH /api/photos/focal-point
// Body: { photoId, entityType: 'army-unit' | 'battle', focalPoint: 'top' | 'center' | 'bottom' }
// Updates focal_point on the photo row so displays can use the right object-position.
export async function PATCH(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { photoId, entityType, focalPoint } = await request.json();

  if (!photoId || !entityType || !focalPoint) {
    return NextResponse.json({ error: 'Missing photoId, entityType, or focalPoint' }, { status: 400 });
  }
  if (!VALID_FOCAL_POINTS.includes(focalPoint)) {
    return NextResponse.json({ error: 'focalPoint must be top, center, or bottom' }, { status: 400 });
  }

  const admin = createAdminClient();

  if (entityType === 'army-unit') {
    // Verify caller owns the parent army
    const { data: photoRows } = await admin
      .from('army_unit_photos')
      .select('*, army_units(army_id, armies(player_id))')
      .eq('id', photoId)
      .limit(1);
    const photo = photoRows?.[0] ?? null;
    if (!photo) return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    if (photo.army_units?.armies?.player_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { error } = await admin
      .from('army_unit_photos')
      .update({ focal_point: focalPoint })
      .eq('id', photoId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (entityType === 'battle') {
    // Verify caller is a participant or organiser
    const { data: photoRows } = await admin
      .from('battle_photos')
      .select('*, battles(attacker_player_id, defender_player_id, logged_by, campaigns(organiser_id))')
      .eq('id', photoId)
      .limit(1);
    const photo = photoRows?.[0] ?? null;
    if (!photo) return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    const battle = photo.battles;
    const canEdit = battle && (
      user.id === battle.attacker_player_id ||
      user.id === battle.defender_player_id ||
      user.id === battle.logged_by ||
      user.id === battle.campaigns?.organiser_id
    );
    if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { error } = await admin
      .from('battle_photos')
      .update({ focal_point: focalPoint })
      .eq('id', photoId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown entityType' }, { status: 400 });
}
