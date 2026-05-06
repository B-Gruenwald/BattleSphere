/**
 * POST /api/notifications/create
 *
 * Auth-gated endpoint for client components to fire notifications.
 * The requesting user must be authenticated — the notification
 * recipient is specified in the body (not necessarily the caller).
 *
 * Body:
 *   {
 *     recipientId: string,   // UUID of the user to notify
 *     type:        string,   // NOTIF_TYPES key
 *     title:       string,
 *     body:        string,   // optional
 *     link:        string,   // optional
 *     metadata:    object,   // optional
 *   }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createNotification } from '@/app/lib/notifications';

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { recipientId, type, title, body: notifBody, link, metadata } = body;

  if (!recipientId || !type || !title) {
    return NextResponse.json({ error: 'recipientId, type, and title are required' }, { status: 400 });
  }

  await createNotification(recipientId, { type, title, body: notifBody, link, metadata });

  return NextResponse.json({ ok: true });
}
