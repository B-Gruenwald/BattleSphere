import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/factions?campaign_id=
// Returns factions for a campaign. Public — no auth required.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const campaign_id = searchParams.get('campaign_id');
  if (!campaign_id) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 });

  const admin = createAdminClient();
  const { data: factions, error } = await admin
    .from('factions')
    .select('id, name, colour')
    .eq('campaign_id', campaign_id)
    .order('created_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ factions: factions || [] });
}
