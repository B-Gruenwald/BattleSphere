import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/armies
// Body: { name, game_system, faction_name, tagline, backstory, cover_image_url }
// Creates a new army owned by the authenticated user.
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { name, game_system, faction_name, tagline, backstory, cover_image_url } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Army name is required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('armies')
    .insert({
      player_id:       user.id,
      name:            name.trim(),
      game_system:     game_system?.trim()   || null,
      faction_name:    faction_name?.trim()  || null,
      tagline:         tagline?.trim()       || null,
      backstory:       backstory?.trim()     || null,
      cover_image_url: cover_image_url       || null,
    })
    .select('*')
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ army: data?.[0] ?? null });
}
