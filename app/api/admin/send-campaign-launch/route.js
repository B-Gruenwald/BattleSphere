import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Resend } from 'resend';

const APP_URL       = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.battlesphere.cc';
const CAMPAIGN_URL  = `${APP_URL}/c/austriacus-subsector-93n4g`;
const BATTLE_URL    = `${APP_URL}/c/austriacus-subsector-93n4g/battle/new`;

// POST /api/admin/send-campaign-launch
// Body: { testEmail: 'someone@example.com' }  → sends only to that address
//       { sendToAll: true }                    → sends to every user (admin only)
export async function POST(request) {
  // ── Auth: admin only ─────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthorised.' }, { status: 401 });

  const { data: profileRows } = await supabase
    .from('profiles').select('*').eq('id', user.id).limit(1);
  if (!profileRows?.[0]?.is_admin) {
    return Response.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const body        = await request.json();
  const { testEmail, sendToAll } = body;

  if (!testEmail && !sendToAll) {
    return Response.json({ error: 'Provide testEmail or sendToAll: true.' }, { status: 400 });
  }

  const resend    = new Resend(process.env.RESEND_API_KEY);
  const fromAddr  = process.env.RESEND_FROM_EMAIL;
  const adminClient = createAdminClient();

  // ── Build recipient list ─────────────────────────────────────────────────
  let recipients = []; // [{ email, username }]

  if (testEmail) {
    recipients = [{ email: testEmail, username: 'Commander' }];
  } else {
    // Fetch all auth users via admin API (paginated)
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data: { users }, error } = await adminClient.auth.admin.listUsers({
        page, perPage,
      });
      if (error || !users?.length) break;

      // Fetch matching usernames from profiles
      const ids = users.map(u => u.id);
      const { data: profiles } = await adminClient
        .from('profiles').select('*').in('id', ids);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

      for (const u of users) {
        if (!u.email) continue;
        const username = profileMap[u.id]?.username || 'Commander';
        recipients.push({ email: u.email, username });
      }

      if (users.length < perPage) break;
      page++;
    }
  }

  if (recipients.length === 0) {
    return Response.json({ error: 'No recipients found.' }, { status: 404 });
  }

  // ── Send ─────────────────────────────────────────────────────────────────
  let sent = 0;
  const errors = [];

  for (const { email, username } of recipients) {
    try {
      const { error: emailErr } = await resend.emails.send({
        from:    fromAddr,
        to:      email,
        subject: 'The Campaign for the Austriacus Subsector has begun',
        html:    buildEmailHtml(username),
      });
      if (emailErr) {
        errors.push({ email, error: emailErr.message });
      } else {
        sent++;
      }
    } catch (err) {
      errors.push({ email, error: err.message });
    }
  }

  return Response.json({ sent, total: recipients.length, errors });
}

// ── HTML builder ─────────────────────────────────────────────────────────────
function buildEmailHtml(username) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>The Campaign for the Austriacus Subsector has begun</title>
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
                           text-transform:uppercase;">BattleSphere</span>
            </td>
            <td align="right" style="vertical-align:bottom;">
              <span style="font-size:11px; color:#7a7a9a; letter-spacing:0.06em;
                           text-transform:uppercase;">Campaign Dispatch</span>
            </td>
          </tr>
        </table>
        <div style="height:1px; background:#c9a84c; margin-top:16px; opacity:0.4;"></div>
      </td>
    </tr>

    <!-- Hero -->
    <tr>
      <td style="padding:36px 36px 0;">
        <p style="margin:0 0 6px; font-size:11px; font-weight:bold;
                  letter-spacing:0.16em; text-transform:uppercase; color:#a07830;">
          Commander
        </p>
        <h1 style="margin:0 0 20px; font-family:Georgia,'Times New Roman',serif;
                   font-size:26px; font-weight:bold; color:#1a1a2e;
                   line-height:1.25; letter-spacing:0.02em;">
          The Campaign for the<br/>
          <a href="${CAMPAIGN_URL}" style="color:#c9a84c; text-decoration:none;
             border-bottom:2px solid rgba(201,168,76,0.35);">Austriacus Subsector</a>
          has begun.
        </h1>
        <p style="margin:0 0 16px; font-size:15px; color:#2d2d3d; line-height:1.7;">
          Dear <strong>${username}</strong>,
        </p>
        <p style="margin:0 0 24px; font-size:15px; color:#2d2d3d; line-height:1.7;">
          The Campaign for the
          <a href="${CAMPAIGN_URL}" style="color:#c9a84c; text-decoration:none;
             border-bottom:1px solid rgba(201,168,76,0.4);">Austriacus Subsector</a>
          has begun &mdash; and your battles decide the outcome.
          Factions are already moving across the star map. Every game you play, whether
          Warhammer 40,000, Kill Team or Necromunda, translates directly into territorial
          influence. Log it, and watch the map change.
        </p>
      </td>
    </tr>

    <!-- Plan your campaign -->
    <tr>
      <td style="padding:0 36px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:#f7f4ee; border-left:3px solid #c9a84c; border-radius:3px;">
          <tr>
            <td style="padding:18px 20px;">
              <p style="margin:0 0 8px; font-size:11px; font-weight:bold;
                        letter-spacing:0.12em; text-transform:uppercase; color:#a07830;">
                Plan your campaign
              </p>
              <p style="margin:0; font-size:14px; color:#2d2d3d; line-height:1.7;">
                Will you spread your forces wide, painting the Subsector in your faction&apos;s colours?
                Or dig in deep, turning a single system into an unassailable bastion?
                The choice &mdash; and the consequences &mdash; are yours.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Get involved -->
    <tr>
      <td style="padding:28px 36px 0;">
        <p style="margin:0 0 16px; font-size:11px; font-weight:bold;
                  letter-spacing:0.12em; text-transform:uppercase; color:#888;">
          Get involved
        </p>
        <!-- Step 1 -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;">
          <tr>
            <td style="vertical-align:top; width:30px;">
              <div style="width:20px; height:20px; background:#0f0f1a; text-align:center;
                          line-height:20px; font-size:10px; font-weight:bold; color:#c9a84c;">1</div>
            </td>
            <td style="padding-left:10px;">
              <p style="margin:0; font-size:14px; color:#2d2d3d; line-height:1.6;">
                Visit the
                <a href="${CAMPAIGN_URL}" style="color:#c9a84c; text-decoration:none;
                   font-weight:bold; border-bottom:1px solid rgba(201,168,76,0.4);">Austriacus Subsector</a>
                to follow the campaign and read the latest narrative dispatches.
              </p>
            </td>
          </tr>
        </table>
        <!-- Step 2 -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;">
          <tr>
            <td style="vertical-align:top; width:30px;">
              <div style="width:20px; height:20px; background:#0f0f1a; text-align:center;
                          line-height:20px; font-size:10px; font-weight:bold; color:#c9a84c;">2</div>
            </td>
            <td style="padding-left:10px;">
              <p style="margin:0; font-size:14px; color:#2d2d3d; line-height:1.6;">
                Join a faction if you haven&apos;t already.
              </p>
            </td>
          </tr>
        </table>
        <!-- Step 3 -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="vertical-align:top; width:30px;">
              <div style="width:20px; height:20px; background:#0f0f1a; text-align:center;
                          line-height:20px; font-size:10px; font-weight:bold; color:#c9a84c;">3</div>
            </td>
            <td style="padding-left:10px;">
              <p style="margin:0; font-size:14px; color:#2d2d3d; line-height:1.6;">
                <a href="${BATTLE_URL}" style="color:#c9a84c; text-decoration:none;
                   font-weight:bold; border-bottom:1px solid rgba(201,168,76,0.4);">
                  Log your battle results</a>
                to earn Influence for your faction and XP for yourself.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- CTA button -->
    <tr>
      <td style="padding:28px 36px 0; text-align:center;">
        <a href="${CAMPAIGN_URL}"
           style="display:inline-block; padding:14px 32px; background:#c9a84c;
                  color:#07070a; font-size:12px; font-weight:bold;
                  letter-spacing:0.14em; text-transform:uppercase;
                  text-decoration:none; border-radius:2px;">
          Enter the Campaign &rarr;
        </a>
      </td>
    </tr>

    <!-- Personal note -->
    <tr>
      <td style="padding:32px 36px 0;">
        <div style="height:1px; background:#e8e8e8; margin-bottom:24px;"></div>
        <p style="margin:0 0 6px; font-size:11px; font-weight:bold;
                  letter-spacing:0.12em; text-transform:uppercase; color:#888;">
          A personal note
        </p>
        <p style="margin:0 0 14px; font-size:14px; color:#555; line-height:1.7;">
          This is the last unsolicited email I&apos;ll send you &mdash; I promise. The next time
          you visit battlesphere.cc, I&apos;ll ask whether you&apos;d like to receive campaign
          updates: story developments, events, and news from the front, at a frequency of
          your choosing. I hope you&apos;ll say yes. BattleSphere is still growing, and the
          <a href="${CAMPAIGN_URL}" style="color:#c9a84c; text-decoration:none;
             border-bottom:1px solid rgba(201,168,76,0.3);">Austriacus Subsector</a>
          has a lot in store.
        </p>
        <p style="margin:0; font-size:14px; color:#555; line-height:1.7;">
          &mdash; Benjamin
        </p>
      </td>
    </tr>

    <!-- Spacer -->
    <tr><td style="height:36px;"></td></tr>

    <!-- Footer -->
    <tr>
      <td style="background:#f5f5f5; padding:24px 36px; border-top:1px solid #e8e8e8;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="font-size:12px; color:#888; line-height:1.7;">
              You&apos;re receiving this as an existing BattleSphere user.<br/>
              <a href="${APP_URL}" style="color:#c9a84c; text-decoration:none;">
                battlesphere.cc
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
