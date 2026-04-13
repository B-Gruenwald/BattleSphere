import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/photos/faction
// Body: { factionId, url }
// Saves a Cloudinary photo URL to the faction_photos table.
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { factionId, url } = await request.json();
  if (!factionId || !url) {
    return NextResponse.json({ error: 'Missing factionId or url' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('faction_photos')
    .insert({ faction_id: factionId, uploader_id: user.id, url })
    .select('*')
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ photo: data?.[0] ?? null });
}

// DELETE /api/photos/faction?id=<photoId>
// Removes a faction photo — allowed for the uploader, any faction member,
// or the campaign organiser.
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
    .from('faction_photos')
    .select('*')
    .eq('id', photoId)
    .limit(1);
  const photo = photoRows?.[0] ?? null;
  if (!photo) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Fetch the parent faction → campaign
  const { data: factionRows } = await admin
    .from('factions')
    .select('campaign_id')
    .eq('id', photo.faction_id)
    .limit(1);
  const faction = factionRows?.[0] ?? null;

  const { data: campaignRows } = faction
    ? await admin.from('campaigns').select('organiser_id').eq('id', faction.campaign_id).limit(1)
    : { data: [] };
  const campaign = campaignRows?.[0] ?? null;

  // Check if user is a member of this faction
  const { data: memberRows } = faction
    ? await admin
        .from('campaign_members')
        .select('user_id')
        .eq('campaign_id', faction.campaign_id)
        .eq('faction_id', photo.faction_id)
        .eq('user_id', user.id)
        .limit(1)
    : { data: [] };
  const isMember = (memberRows?.length ?? 0) > 0;

  const canDelete =
    photo.uploader_id === user.id ||
    campaign?.organiser_id === user.id ||
    isMember;

  if (!canDelete) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await admin.from('faction_photos').delete().eq('id', photoId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
