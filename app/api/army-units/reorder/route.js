import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/army-units/reorder
// Body: { armyId, ids: [uuid, uuid, ...] }  — ordered array of unit IDs
// Assigns sort_order 0, 1, 2, … to each unit in the given sequence.
// Army owner only.
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { armyId, ids } = await request.json();

  if (!armyId || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'Missing armyId or ids' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify caller owns the army
  const { data: armyRows } = await admin
    .from('armies')
    .select('player_id')
    .eq('id', armyId)
    .limit(1);
  if (armyRows?.[0]?.player_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Batch-update sort_order for each unit
  const updates = await Promise.all(
    ids.map((id, idx) =>
      admin
        .from('army_units')
        .update({ sort_order: idx })
        .eq('id', id)
        .eq('army_id', armyId) // safety: only touch units belonging to this army
    )
  );

  const failed = updates.find(r => r.error);
  if (failed) {
    return NextResponse.json({ error: failed.error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
