/**
 * GET  /api/notifications        — fetch the current user's notifications
 * PATCH /api/notifications       — mark notifications as read
 *
 * GET query params:
 *   ?limit=20    (default 20, max 50)
 *   ?offset=0
 *
 * PATCH body:
 *   { all: true }           — mark all as read
 *   { ids: ["uuid", ...] }  — mark specific notifications as read
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit  = Math.min(parseInt(searchParams.get('limit')  ?? '20', 10), 50);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  const admin = createAdminClient();

  // Total unread count (cheap query, no OFFSET)
  const { count: unreadCount } = await admin
    .from('user_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  // Paginated notifications, newest first
  const { data: notifications, error } = await admin
    .from('user_notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    notifications: notifications ?? [],
    unreadCount:   unreadCount  ?? 0,
  });
}

export async function PATCH(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const admin = createAdminClient();

  let query = admin
    .from('user_notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (!body.all) {
    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json({ error: 'Provide ids[] or all:true' }, { status: 400 });
    }
    query = query.in('id', body.ids);
  }

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
