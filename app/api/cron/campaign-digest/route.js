import { createAdminClient } from '@/lib/supabase/admin';
import { Resend } from 'resend';

const APP_URL      = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.battlesphere.cc';
const CRON_SECRET  = process.env.CRON_SECRET;

// Threshold in days for each frequency
const FREQUENCY_DAYS = { weekly: 7, fortnightly: 14, monthly: 30 };

// ── Entry point ──────────────────────────────────────────────────────────────
export async function GET(request) {
  // Verify the call is from Vercel Cron (or a manual test with the right secret)
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorised.' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const resend   = new Resend(process.env.RESEND_API_KEY);
  const fromAddr = process.env.RESEND_FROM_EMAIL;
  const now      = new Date();

  // ── 1. Find users eligible for a digest ─────────────────────────────────
  // Eligible = at least one optin is true, frequency is set,
  // and the threshold since last_digest_sent_at has elapsed.
  const { data: profiles, error: profilesErr } = await supabase
    .from('profiles')
    .select('*')
    .not('digest_frequency', 'is', null)
    .or('optin_platform_news.eq.true,optin_campaign_digests.eq.true');

  if (profilesErr) {
    console.error('cron: error fetching profiles', profilesErr);
    return Response.json({ error: 'DB error.' }, { status: 500 });
  }

  const eligible = (profiles || []).filter(p => {
    const days = FREQUENCY_DAYS[p.digest_frequency];
    if (!days) return false;
    if (!p.last_digest_sent_at) return true; // never sent
    const lastSent = new Date(p.last_digest_sent_at);
    const diffDays = (now - lastSent) / (1000 * 60 * 60 * 24);
    return diffDays >= days;
  });

  if (eligible.length === 0) {
    return Response.json({ sent: 0, message: 'No users due for a digest.' });
  }

  // ── 2. Fetch platform announcements (time-filtered per user below) ───────
  const { data: allAnnouncements } = await supabase
    .from('platform_announcements')
    .select('*')
    .order('created_at', { ascending: false });

  let sent = 0;
  const errors = [];

  for (const profile of eligible) {
    try {
      // Fetch email from auth.users via admin API (not stored in profiles table)
      const { data: authData } = await supabase.auth.admin.getUserById(profile.id);
      const userEmail = authData?.user?.email;
      if (!userEmail) {
        errors.push({ userId: profile.id, error: 'No email found in auth.users' });
        continue;
      }

      const cutoff = profile.last_digest_sent_at
        ? new Date(profile.last_digest_sent_at)
        : new Date(0);

      // ── Platform news since cutoff ──
      const platformItems = profile.optin_platform_news
        ? (allAnnouncements || []).filter(a => new Date(a.created_at) > cutoff)
        : [];

      // ── Campaign sections ──
      let campaignSections = [];

      if (profile.optin_campaign_digests) {
        // Memberships opted into digest
        const { data: memberships } = await supabase
          .from('campaign_members')
          .select('*')
          .eq('user_id', profile.id)
          .eq('include_in_digest', true);

        for (const membership of (memberships || [])) {
          const cid = membership.campaign_id;

          // Campaign details
          const { data: campRows } = await supabase
            .from('campaigns').select('*').eq('id', cid).limit(1);
          const campaign = campRows?.[0];
          if (!campaign) continue;

          // Organiser messages since cutoff
          const { data: orgMessages } = await supabase
            .from('campaign_digest_messages')
            .select('*')
            .eq('campaign_id', cid)
            .gt('created_at', cutoff.toISOString())
            .order('created_at', { ascending: false });

          // Latest bulletin since cutoff (most recent dispatch)
          const { data: bulletins } = await supabase
            .from('bulletin_dispatches')
            .select('*')
            .eq('campaign_id', cid)
            .gt('created_at', cutoff.toISOString())
            .order('dispatch_number', { ascending: false })
            .limit(1);

          // Events since cutoff
          const { data: events } = await supabase
            .from('campaign_events')
            .select('*')
            .eq('campaign_id', cid)
            .gt('created_at', cutoff.toISOString())
            .order('start_date', { ascending: true })
            .limit(3);

          const hasContent =
            (orgMessages?.length > 0) ||
            (bulletins?.length > 0) ||
            (events?.length > 0);

          if (hasContent) {
            campaignSections.push({
              campaign,
              orgMessages: orgMessages || [],
              bulletins:   bulletins   || [],
              events:      events      || [],
            });
          }
        }
      }

      // Skip if nothing to send
      if (platformItems.length === 0 && campaignSections.length === 0) continue;

      // ── Build + send email ──
      const totalCount = platformItems.length + campaignSections.length;
      const html = buildDigestHtml({
        profile,
        platformItems,
        campaignSections,
        totalCount,
        now,
      });

      const { error: emailErr } = await resend.emails.send({
        from:    fromAddr,
        to:      userEmail,
        subject: buildSubject(campaignSections, platformItems),
        html,
      });

      if (emailErr) {
        errors.push({ userId: profile.id, error: emailErr.message });
        continue;
      }

      // Rate-limit guard: Resend free tier caps at ~2 emails/sec
      await new Promise(r => setTimeout(r, 600));

      // Update last_digest_sent_at
      await supabase
        .from('profiles')
        .update({ last_digest_sent_at: now.toISOString() })
        .eq('id', profile.id);

      sent++;
    } catch (err) {
      errors.push({ userId: profile.id, error: err.message });
    }
  }

  console.log(`campaign-digest cron: sent=${sent}, errors=${errors.length}`);
  return Response.json({ sent, errors: errors.length, details: errors });
}

// ── Subject line ─────────────────────────────────────────────────────────────
function buildSubject(campaignSections, platformItems) {
  if (campaignSections.length === 1) {
    return `Campaign Digest — ${campaignSections[0].campaign.name}`;
  }
  if (campaignSections.length > 1) {
    return `Campaign Digest — ${campaignSections.length} campaigns`;
  }
  if (platformItems.length > 0) {
    return `What's new on BattleSphere`;
  }
  return 'Your BattleSphere Digest';
}

// ── HTML builder ─────────────────────────────────────────────────────────────
function buildDigestHtml({ profile, platformItems, campaignSections, totalCount, now }) {
  const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const freqLabel = { weekly: 'Weekly', fortnightly: 'Fortnightly', monthly: 'Monthly' }[profile.digest_frequency] ?? 'Campaign';
  const itemLabel = `${totalCount} update${totalCount !== 1 ? 's' : ''}`;

  // Truncate bulletin body to ~180 chars
  function excerpt(text, max = 180) {
    if (!text) return '';
    const stripped = text.replace(/##\s?/g, '').replace(/\[\[.*?\]\]/g, match => {
      const parts = match.slice(2, -2).split('|');
      return parts[parts.length - 1];
    });
    return stripped.length > max ? stripped.slice(0, max).trimEnd() + '…' : stripped;
  }

  function formatEventDate(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // ── Platform news block ──
  const platformHtml = platformItems.length > 0 ? `
    <tr>
      <td style="padding: 28px 36px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:#f7f4ee; border-left:3px solid #c9a84c; border-radius:3px;">
          <tr>
            <td style="padding:16px 20px;">
              <p style="margin:0 0 10px; font-size:10px; font-weight:bold;
                        letter-spacing:0.1em; text-transform:uppercase; color:#a07830;">
                What&apos;s new on BattleSphere
              </p>
              ${platformItems.map(a => `
                <p style="margin:0 0 10px; font-size:14px; color:#2d2d3d; line-height:1.5;">
                  <strong>${a.title}.</strong> ${a.body}
                </p>
              `).join('')}
            </td>
          </tr>
        </table>
      </td>
    </tr>` : '';

  // ── Campaign sections ──
  const campaignHtml = campaignSections.map((section, idx) => {
    const { campaign, orgMessages, bulletins, events } = section;
    const campaignUrl = `${APP_URL}/campaign/${campaign.slug}`;

    const orgHtml = orgMessages.length > 0 ? `
      <tr>
        <td style="padding:20px 36px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="background:#fffbf2; border:1px solid #e8d89a; border-radius:4px;">
            <tr>
              <td style="padding:16px 20px;">
                <p style="margin:0 0 8px; font-size:10px; font-weight:bold;
                          letter-spacing:0.1em; text-transform:uppercase; color:#a07830;">
                  ✦ &nbsp;Commander&apos;s Orders
                </p>
                ${orgMessages.map(m => `
                  <p style="margin:0 0 8px; font-size:14px; color:#2d2d3d; line-height:1.6;">
                    &ldquo;${m.message}&rdquo;
                  </p>
                `).join('')}
              </td>
            </tr>
          </table>
        </td>
      </tr>` : '';

    const bulletinHtml = bulletins.length > 0 ? bulletins.map(b => `
      <tr>
        <td style="padding:24px 36px 0;">
          <p style="margin:0 0 10px; font-size:10px; font-weight:bold;
                    letter-spacing:0.1em; text-transform:uppercase; color:#888;">
            Latest Dispatch
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="border:1px solid #e8e8e8; border-radius:4px;">
            <tr>
              <td style="padding:18px 20px;">
                <p style="margin:0 0 6px; font-family:Georgia,'Times New Roman',serif;
                          font-size:16px; font-weight:bold; color:#1a1a2e;">
                  Dispatch #${b.dispatch_number}${b.title ? ` — ${b.title}` : ''}
                </p>
                <p style="margin:0 0 14px; font-size:13px; color:#555; line-height:1.6;">
                  ${excerpt(b.body)}
                </p>
                <a href="${campaignUrl}" style="font-size:13px; color:#c9a84c;
                   text-decoration:none; font-weight:bold;">
                  Read the full dispatch &rarr;
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`).join('') : '';

    const eventsHtml = events.length > 0 ? `
      <tr>
        <td style="padding:24px 36px 0;">
          <p style="margin:0 0 12px; font-size:10px; font-weight:bold;
                    letter-spacing:0.1em; text-transform:uppercase; color:#888;">
            Current Events
          </p>
          ${events.map(ev => {
            const d = ev.start_date ? new Date(ev.start_date) : null;
            const day   = d ? d.toLocaleDateString('en-GB', { day: 'numeric' }) : '—';
            const month = d ? d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase() : '';
            return `
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="border:1px solid #e8e8e8; border-radius:4px; margin-bottom:8px;">
              <tr>
                <td style="padding:14px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="vertical-align:top; width:52px;">
                        <table cellpadding="0" cellspacing="0" border="0"
                               style="background:#0f0f1a; border-radius:3px; text-align:center; width:46px;">
                          <tr><td style="padding:4px 0 2px; font-size:9px; color:#c9a84c;
                                         letter-spacing:0.08em; text-transform:uppercase;">${month}</td></tr>
                          <tr><td style="padding:0 0 5px; font-size:18px; font-weight:bold;
                                         color:#ffffff; line-height:1;">${day}</td></tr>
                        </table>
                      </td>
                      <td style="vertical-align:top; padding-left:14px;">
                        <p style="margin:0 0 3px; font-size:14px; font-weight:bold; color:#1a1a2e;">
                          ${ev.name}
                        </p>
                        ${ev.body ? `<p style="margin:0; font-size:13px; color:#666; line-height:1.5;">
                          ${excerpt(ev.body, 120)}</p>` : ''}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>`;
          }).join('')}
        </td>
      </tr>` : '';

    const sectionDivider = idx > 0
      ? `<tr><td style="padding:32px 36px 0;"><div style="height:1px; background:#e8e8e8;"></div></td></tr>`
      : '';

    return `
      ${sectionDivider}
      <!-- Campaign header -->
      <tr>
        <td style="padding:32px 36px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="vertical-align:middle;">
                <span style="font-family:Georgia,'Times New Roman',serif; font-size:17px;
                             font-weight:bold; color:#1a1a2e; letter-spacing:0.04em;">
                  ${campaign.name}
                </span>
              </td>
              <td align="right" style="vertical-align:middle;">
                <a href="${campaignUrl}" style="font-size:12px; color:#c9a84c; text-decoration:none;">
                  Open campaign &rarr;
                </a>
              </td>
            </tr>
            <tr>
              <td colspan="2">
                <div style="height:1px; background:#e0d4b0; margin-top:10px;"></div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      ${orgHtml}
      ${bulletinHtml}
      ${eventsHtml}
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>BattleSphere Campaign Digest</title>
</head>
<body style="margin:0; padding:40px 20px; background:#e8e8e8;
             font-family:Arial,Helvetica,sans-serif;">

  <table width="600" cellpadding="0" cellspacing="0" border="0"
         style="margin:0 auto; background:#ffffff; border-radius:6px; overflow:hidden;">

    <!-- Header -->
    <tr>
      <td style="background:#0f0f1a; padding:28px 36px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td>
              <span style="font-family:Georgia,'Times New Roman',serif; font-size:22px;
                           font-weight:bold; letter-spacing:0.12em; color:#c9a84c;
                           text-transform:uppercase;">
                BattleSphere
              </span>
            </td>
            <td align="right" style="vertical-align:bottom;">
              <span style="font-size:11px; color:#7a7a9a; letter-spacing:0.06em; text-transform:uppercase;">
                Campaign Digest
              </span>
            </td>
          </tr>
        </table>
        <div style="height:1px; background:#c9a84c; margin-top:16px; opacity:0.4;"></div>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;">
          <tr>
            <td style="font-size:13px; color:#9898b8;">${freqLabel} update &nbsp;·&nbsp; ${dateStr}</td>
            <td align="right" style="font-size:12px; color:#5a5a7a;">${itemLabel}</td>
          </tr>
        </table>
      </td>
    </tr>

    ${platformHtml}
    ${campaignHtml}

    <!-- Spacer -->
    <tr><td style="height:36px;"></td></tr>

    <!-- Footer -->
    <tr>
      <td style="background:#f5f5f5; padding:24px 36px; border-top:1px solid #e8e8e8;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="font-size:12px; color:#888; line-height:1.7;">
              You&apos;re receiving this because you opted into BattleSphere campaign digests.<br/>
              <a href="${APP_URL}/profile/notifications" style="color:#c9a84c; text-decoration:none;">
                Manage your notification preferences
              </a>
              &nbsp;&middot;&nbsp;
              <a href="${APP_URL}/profile/notifications" style="color:#888; text-decoration:none;">
                Unsubscribe
              </a>
            </td>
            <td align="right" style="vertical-align:top;">
              <span style="font-family:Georgia,'Times New Roman',serif;
                           font-size:13px; color:#c9a84c; letter-spacing:0.1em;">BS</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
