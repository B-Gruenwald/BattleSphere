import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNotificationForMany } from '@/lib/notifications';

export async function POST(req) {
  // Auth guard — admin only
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { title, body, link, audience, campaignId } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

  const admin = createAdminClient();

  // Resolve recipient user IDs
  let userIds = [];

  if (audience === 'everyone') {
    const { data: profiles } = await admin.from('profiles').select('id');
    userIds = (profiles || []).map(p => p.id);
  } else if (audience === 'campaign' && campaignId) {
    const { data: members } = await admin
      .from('campaign_members')
      .select('user_id')
      .eq('campaign_id', campaignId);
    userIds = (members || []).map(m => m.user_id);
  }

  if (!userIds.length) {
    return NextResponse.json({ error: 'No recipients found' }, { status: 400 });
  }

  await createNotificationForMany(userIds, {
    type:  'platform_broadcast',
    title: title.trim(),
    body:  body?.trim()  || null,
    link:  link?.trim()  || null,
  });

  return NextResponse.json({ ok: true, sent: userIds.length });
}
