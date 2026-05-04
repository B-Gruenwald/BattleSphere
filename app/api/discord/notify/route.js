import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  postToDiscord,
  buildBattleEmbed,
  buildBulletinEmbed,
  buildEventEmbed,
  buildTestEmbed,
} from '@/app/lib/discord';

export async function POST(request) {
  // Auth check — must be a logged-in user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await request.json();
  const { type, campaignId, campaignSlug } = body;
  if (!campaignId || !type) {
    return Response.json({ error: 'Missing campaignId or type' }, { status: 400 });
  }

  // Fetch the webhook URL server-side so it is never exposed to the browser
  const admin = createAdminClient();
  const { data: campRows } = await admin
    .from('campaigns')
    .select('name, discord_webhook_url')
    .eq('id', campaignId)
    .limit(1);
  const campaign = campRows?.[0];

  if (!campaign?.discord_webhook_url) {
    return Response.json({ ok: false, reason: 'No webhook configured' });
  }

  const webhookUrl  = campaign.discord_webhook_url;
  const campaignName = campaign.name;

  let payload;

  if (type === 'battle') {
    payload = buildBattleEmbed({ ...body, campaignName });

  } else if (type === 'bulletin') {
    payload = buildBulletinEmbed({ dispatch: body.dispatch, campaignName, campaignSlug });

  } else if (type === 'event') {
    payload = buildEventEmbed({ event: body.event, campaignName, campaignSlug });

  } else if (type === 'test') {
    payload = buildTestEmbed(campaignName);

  } else {
    return Response.json({ error: 'Unknown type' }, { status: 400 });
  }

  await postToDiscord(webhookUrl, payload);
  return Response.json({ ok: true });
}
