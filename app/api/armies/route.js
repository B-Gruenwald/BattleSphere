import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNotification } from '@/app/lib/notifications';

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
  const army = data?.[0] ?? null;

  // First-army onboarding notification — only if this is their first army
  if (army) {
    const { count: armyCount } = await admin
      .from('armies')
      .select('id', { count: 'exact', head: true })
      .eq('player_id', user.id);

    if (armyCount === 1) {
      createNotification(user.id, {
        type:  'onboarding_army',
        title: `${army.name} is deployed — build it out!`,
        body:  'Add units, upload photos, record Crusade progress, and link your army to a campaign to start earning battle honours.',
        link:  `/armies/${army.id}/edit`,
        metadata: {
          tips: [
            { label: 'Add units',          link: `/armies/${army.id}/edit` },
            { label: 'Upload photos',      link: `/armies/${army.id}/edit` },
            { label: 'Browse campaigns',   link: '/campaigns' },
          ],
        },
      });
    }
  }

  return NextResponse.json({ army });
}
