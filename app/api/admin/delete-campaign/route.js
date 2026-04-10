import { createClient }      from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function DELETE(request) {
  try {
    // ── 1. Verify the caller is a super-admin ────────────────────────────────
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'Unauthorised.' }, { status: 401 });
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    if (!profile?.is_admin) {
      return Response.json({ error: 'Forbidden.' }, { status: 403 });
    }

    // ── 2. Parse the campaign ID ─────────────────────────────────────────────
    const { campaignId } = await request.json();
    if (!campaignId) {
      return Response.json({ error: 'campaignId is required.' }, { status: 400 });
    }

    // ── 3. Delete via admin client (bypasses RLS) ────────────────────────────
    //    All related rows (members, factions, territories, battles, events,
    //    achievements, invite codes) cascade-delete via FK constraints.
    const admin = createAdminClient();
    const { error: deleteError } = await admin
      .from('campaigns')
      .delete()
      .eq('id', campaignId);

    if (deleteError) {
      console.error('delete-campaign error:', deleteError);
      return Response.json({ error: deleteError.message }, { status: 500 });
    }

    return Response.json({ success: true });

  } catch (err) {
    console.error('delete-campaign route error:', err);
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
