/**
 * Daily cron — Campaign Event live notifications
 *
 * Runs once a day (see vercel.json: 0 9 * * *).
 * Finds campaign events that:
 *   - have status = 'active'
 *   - have a starts_at that fell within the last 25 hours
 *     (25h window rather than 24h gives a small overlap buffer for cron drift)
 *   - have not yet had an event_live notification sent (tracked via
 *     campaign_events.notif_sent_at column — added by migration)
 *
 * Notifies all campaign members when an event in their campaign goes live.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { createNotificationForMany } from '@/app/lib/notifications';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorised.' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const windowStart = new Date(now.getTime() - 25 * 60 * 60 * 1000); // 25 hours ago

  // Find events that went live in the last 25 hours and are still active
  const { data: events, error: evErr } = await supabase
    .from('campaign_events')
    .select('id, name, campaign_id, starts_at')
    .eq('status', 'active')
    .not('starts_at', 'is', null)
    .gte('starts_at', windowStart.toISOString())
    .lte('starts_at', now.toISOString())
    .is('notif_sent_at', null); // only unsent

  if (evErr) {
    return Response.json({ error: `campaign_events query failed: ${evErr.message}` }, { status: 500 });
  }

  if (!events || events.length === 0) {
    return Response.json({ sent: 0, message: 'No new live events found.' });
  }

  // Fetch campaigns for these events (for name + slug)
  const campaignIds = [...new Set(events.map(e => e.campaign_id))];
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name, slug')
    .in('id', campaignIds);
  const campaignMap = Object.fromEntries((campaigns ?? []).map(c => [c.id, c]));

  // Fetch all members for affected campaigns
  const { data: members } = await supabase
    .from('campaign_members')
    .select('campaign_id, user_id')
    .in('campaign_id', campaignIds);

  // Build campaign_id → [user_id] map
  const membersByCampaign = {};
  for (const m of (members ?? [])) {
    if (!membersByCampaign[m.campaign_id]) membersByCampaign[m.campaign_id] = [];
    membersByCampaign[m.campaign_id].push(m.user_id);
  }

  let sent = 0;
  const sentEventIds = [];

  for (const event of events) {
    const campaign    = campaignMap[event.campaign_id];
    const memberIds   = membersByCampaign[event.campaign_id] ?? [];
    if (!campaign || memberIds.length === 0) continue;

    await createNotificationForMany(memberIds, {
      type:  'event_live',
      title: `Campaign Event is now active: ${event.name}`,
      body:  `A new event has gone live in ${campaign.name}. Check the conditions and see what's at stake.`,
      link:  `/c/${campaign.slug}/events/${event.id}`,
    });

    sent += memberIds.length;
    sentEventIds.push(event.id);
  }

  // Stamp notif_sent_at so we don't re-notify on the next run
  if (sentEventIds.length > 0) {
    await supabase
      .from('campaign_events')
      .update({ notif_sent_at: now.toISOString() })
      .in('id', sentEventIds);
  }

  return Response.json({ sent, events: sentEventIds.length });
}
