import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/photos/battle
// Body: { battleId, url }
// Saves a Cloudinary photo URL to the battle_photos table.
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { battleId, url } = await request.json();
  if (!battleId || !url) {
    return NextResponse.json({ error: 'Missing battleId or url' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('battle_photos')
    .insert({ battle_id: battleId, uploader_id: user.id, url })
    .select('*')
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ photo: data?.[0] ?? null });
}

// PATCH /api/photos/battle
// Body: { photoId, battleId }
// Sets one photo as the portrait for a battle (clears is_portrait on all others).
export async function PATCH(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { photoId, battleId } = await request.json();
  if (!photoId || !battleId) {
    return NextResponse.json({ error: 'Missing photoId or battleId' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Fetch the photo + parent battle
  const { data: photoRows } = await admin
    .from('battle_photos')
    .select('*')
    .eq('id', photoId)
    .limit(1);
  const photo = photoRows?.[0] ?? null;
  if (!photo) return NextResponse.json({ error: 'Photo not found' }, { status: 404 });

  const { data: battleRows } = await admin
    .from('battles')
    .select('campaign_id, logged_by, attacker_player_id, defender_player_id')
    .eq('id', battleId)
    .limit(1);
  const battle = battleRows?.[0] ?? null;
  if (!battle) return NextResponse.json({ error: 'Battle not found' }, { status: 404 });

  const { data: campaignRows } = await admin
    .from('campaigns')
    .select('organiser_id')
    .eq('id', battle.campaign_id)
    .limit(1);
  const organiser_id = campaignRows?.[0]?.organiser_id ?? null;

  const canEdit =
    user.id === battle.logged_by ||
    user.id === battle.attacker_player_id ||
    user.id === battle.defender_player_id ||
    user.id === organiser_id;

  if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Clear portrait flag on all photos for this battle, then set on the target
  await admin
    .from('battle_photos')
    .update({ is_portrait: false })
    .eq('battle_id', battleId);

  const { error } = await admin
    .from('battle_photos')
    .update({ is_portrait: true })
    .eq('id', photoId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// DELETE /api/photos/battle?id=<photoId>
// Removes a battle photo — allowed for the uploader or anyone with edit rights
// on the battle (logger, attacker, defender, or campaign organiser).
export async function DELETE(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const photoId = searchParams.get('id');
  if (!photoId) return NextResponse.json({ error: 'Missing photo id' }, { status: 400 });

  const admin = createAdminClient();

  // Fetch the photo
  const { data: photoRows } = await admin
    .from('battle_photos')
    .select('*')
    .eq('id', photoId)
    .limit(1);
  const photo = photoRows?.[0] ?? null;
  if (!photo) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Fetch the parent battle for edit-rights checks
  const { data: battleRows } = await admin
    .from('battles')
    .select('campaign_id, logged_by, attacker_player_id, defender_player_id')
    .eq('id', photo.battle_id)
    .limit(1);
  const battle = battleRows?.[0] ?? null;

  // Fetch campaign organiser
  const { data: campaignRows } = battle
    ? await admin.from('campaigns').select('organiser_id').eq('id', battle.campaign_id).limit(1)
    : { data: [] };
  const campaign = campaignRows?.[0] ?? null;

  const canDelete =
    photo.uploader_id === user.id ||
    battle?.logged_by === user.id ||
    battle?.attacker_player_id === user.id ||
    battle?.defender_player_id === user.id ||
    campaign?.organiser_id === user.id;

  if (!canDelete) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await admin.from('battle_photos').delete().eq('id', photoId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
