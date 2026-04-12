import { createAdminClient } from '@/lib/supabase/admin';
import { Resend } from 'resend';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.battlesphere.cc';

export async function POST(request) {
  try {
    const { email, campaignSlug, campaignId, campaignName } = await request.json();

    if (!email || !campaignId) {
      return Response.json({ error: 'Email and campaign ID are required.' }, { status: 400 });
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    // Use admin client to find an active invite code for this campaign (bypasses RLS)
    const adminSupabase = createAdminClient();
    const now = new Date().toISOString();

    const { data: inviteCodes } = await adminSupabase
      .from('campaign_invite_codes')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('is_revoked', false)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .limit(1);

    const inviteCode  = inviteCodes?.[0];
    const inviteLink  = inviteCode
      ? `${APP_URL}/join/${inviteCode.code}`
      : `${APP_URL}/register`;

    const campaignPublicUrl = `${APP_URL}/campaign/${campaignSlug}`;
    const name = campaignName ?? 'the campaign';

    // Send via Resend
    const resend   = new Resend(process.env.RESEND_API_KEY);
    const fromAddr = process.env.RESEND_FROM_EMAIL;

    const { error: emailError } = await resend.emails.send({
      from:    fromAddr,
      to:      email.trim(),
      subject: `You're invited to join ${name} on BattleSphere`,
      html:    buildEmailHtml({ name, campaignPublicUrl, inviteLink }),
    });

    if (emailError) {
      console.error('Request-access email error:', emailError);
      return Response.json({ error: 'Email could not be sent. Please try again.' }, { status: 500 });
    }

    return Response.json({ success: true });

  } catch (err) {
    console.error('request-access route error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}

function buildEmailHtml({ name, campaignPublicUrl, inviteLink }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Join ${name} on BattleSphere</title>
</head>
<body style="margin:0; padding:0; background:#07070a; font-family: Georgia, 'Times New Roman', serif;">
  <div style="max-width:620px; margin:0 auto; padding:2rem 1rem;">

    <!-- Header -->
    <div style="text-align:center; padding:2.5rem 2rem 2rem; border-bottom:1px solid #2a2018;">
      <div style="font-size:0.65rem; font-weight:700; letter-spacing:0.28em; text-transform:uppercase; color:#b78c40; margin-bottom:0.6rem;">
        ⚔ &nbsp; BattleSphere &nbsp; ⚔
      </div>
      <div style="font-size:2rem; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#e8e0d0; line-height:1.1;">
        Welcome, Commander
      </div>
    </div>

    <!-- Main card -->
    <div style="background:#0d0d0f; border:1px solid #2a2018; border-top:none; padding:2.5rem 2rem;">

      <p style="font-size:1rem; line-height:1.8; color:#e8e0d0; margin:0 0 1.4rem;">
        You requested access to <strong style="color:#b78c40;">${name}</strong> on BattleSphere — a narrative wargaming campaign platform where gaming groups fight over interactive maps, log their battles, and build a living chronicle of their campaign.
      </p>

      <p style="font-size:0.9rem; color:#b78c40; margin:0 0 2.5rem; font-style:italic;">— Benjamin</p>

      <div style="border-top:1px solid #2a2018; margin-bottom:2.5rem;"></div>

      <!-- Step 1 -->
      <h2 style="font-size:0.65rem; font-weight:700; letter-spacing:0.2em; text-transform:uppercase; color:#b78c40; margin:0 0 0.6rem;">
        Step 1 — Create your account
      </h2>
      <p style="font-size:0.95rem; line-height:1.7; color:#c8bfa8; margin:0 0 1.2rem;">
        Register for free. No subscription, no catch — just your name and a password.
      </p>
      <div style="text-align:center; margin:0 0 2.5rem;">
        <a href="${APP_URL}/register"
           style="display:inline-block; padding:0.8rem 2.2rem; background:transparent; color:#b78c40; border:1px solid #b78c40; text-decoration:none; font-size:0.75rem; font-weight:700; letter-spacing:0.16em; text-transform:uppercase;">
          Register Now &rarr;
        </a>
      </div>

      <div style="border-top:1px solid #2a2018; margin-bottom:2.5rem;"></div>

      <!-- Step 2 -->
      <h2 style="font-size:0.65rem; font-weight:700; letter-spacing:0.2em; text-transform:uppercase; color:#b78c40; margin:0 0 0.6rem;">
        Step 2 — Join the campaign
      </h2>
      <p style="font-size:0.95rem; line-height:1.7; color:#c8bfa8; margin:0 0 0.5rem;">
        Once you have an account, use your personal invite link to join
        <a href="${campaignPublicUrl}" style="color:#b78c40; text-decoration:none; border-bottom:1px solid rgba(183,140,64,0.4);">${name}</a>:
      </p>
      <div style="text-align:center; margin:1.2rem 0 2.5rem;">
        <a href="${inviteLink}"
           style="display:inline-block; padding:0.8rem 2.2rem; background:#b78c40; color:#07070a; border:1px solid #b78c40; text-decoration:none; font-size:0.75rem; font-weight:700; letter-spacing:0.16em; text-transform:uppercase;">
          Join ${name} &rarr;
        </a>
      </div>

      <div style="border-top:1px solid #2a2018; margin-bottom:2rem;"></div>

      <p style="font-size:0.88rem; line-height:1.7; color:#a09880; margin:0;">
        Explore the
        <a href="${campaignPublicUrl}" style="color:#b78c40; text-decoration:none; border-bottom:1px solid rgba(183,140,64,0.4);">
          campaign page
        </a>
        to see the map, faction standings, and the campaign chronicle before you join.
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align:center; padding:1.5rem 2rem;">
      <div style="font-size:0.6rem; letter-spacing:0.2em; text-transform:uppercase; color:#3a3020; margin-bottom:0.4rem;">⚔ &nbsp; BattleSphere &nbsp; ⚔</div>
      <a href="${APP_URL}" style="font-size:0.75rem; color:#4a3a1a; text-decoration:none; letter-spacing:0.06em;">battlesphere.cc</a>
    </div>
  </div>
</body>
</html>
  `;
}
