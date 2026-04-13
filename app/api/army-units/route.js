import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/army-units
// Body: { armyId, name, unit_type, description, sort_order }
// Creates a new unit inside an army. Owner of army only.
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { armyId, name, unit_type, description, sort_order } = await request.json();

  if (!armyId || !name?.trim()) {
    return NextResponse.json({ error: 'Missing armyId or name' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify the caller owns the parent army
  const { data: armyRows } = await admin
    .from('armies')
    .select('player_id')
    .eq('id', armyId)
    .limit(1);
  if (armyRows?.[0]?.player_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await admin
    .from('army_units')
    .insert({
      army_id:     armyId,
      name:        name.trim(),
      unit_type:   unit_type?.trim()   || null,
      description: description?.trim() || null,
      sort_order:  sort_order ?? 0,
    })
    .select('*')
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ unit: data?.[0] ?? null });
}
