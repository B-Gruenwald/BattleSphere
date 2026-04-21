import { createAdminClient } from '@/lib/supabase/admin';
import { Resend } from 'resend';

const APP_URL          = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.battlesphere.cc';
const AUSTRIACUS_SLUG  = 'austriacus-subsector-93n4g';
const AUSTRIACUS_URL   = `${APP_URL}/campaign/${AUSTRIACUS_SLUG}`;

export async function POST(request) {
  try {
    const { email, username } = await request.json();

    if (!email) {
      return Response.json({ error: 'Email is required.' }, { status: 400 });
    }

    // Look up an active invite code for the Austriacus Subsector open narrative campaign
    const adminSupabase = createAdminClient();
    const now = new Date().toISOString();

    const { data: campaignRows } = await adminSupabase
      .from('campaigns')
      .select('id')
      .eq('slug', AUSTRIACUS_SLUG)
      .limit(1);

    const campaignId = campaignRows?.[0]?.id ?? null;

    let inviteLink = AUSTRIACUS_URL; // fallback: public page
    if (campaignId) {
      const { data: inviteCodes } = await adminSupabase
        .from('campaign_invite_codes')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('is_revoked', false)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .limit(1);

      if (inviteCodes?.[0]) {
        inviteLink = `${APP_URL}/join/${inviteCodes[0].code}`;
      }
    }

    const resend    = new Resend(process.env.RESEND_API_KEY);
    const fromAddr  = process.env.RESEND_FROM_EMAIL;
    const salutation = username ? `Commander ${username}` : 'Commander';

    const { error: emailError } = await resend.emails.send({
      from:    fromAddr,
      to:      email.trim(),
      subject: 'Welcome to BattleSphere — your campaign awaits',
      html:    buildWelcomeEmail({ salutation, inviteLink }),
    });

    if (emailError) {
      console.error('Welcome email error:', emailError);
      return Response.json({ error: 'Email could not be sent.' }, { status: 500 });
    }

    return Response.json({ success: true });

  } catch (err) {
    console.error('send-welcome-email route error:', err);
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

function buildWelcomeEmail({ salutation, inviteLink }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to BattleSphere</title>
</head>
<body style="margin:0; padding:0; background:#07070a; font-family: Georgia, 'Times New Roman', serif;">
  <div style="max-width:620px; margin:0 auto; padding:2rem 1rem;">

    <!-- Header -->
    <div style="text-align:center; padding:2.5rem 2rem 2rem; border-bottom:1px solid #2a2018;">
      <div style="font-size:0.65rem; font-weight:700; letter-spacing:0.28em; text-transform:uppercase; color:#b78c40; margin-bottom:0.6rem;">
        ⚔ &nbsp; BattleSphere &nbsp; ⚔
      </div>
      <div style="font-size:2rem; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#e8e0d0; line-height:1.1;">
        Welcome, ${salutation}
      </div>
    </div>

    <!-- Main card -->
    <div style="background:#0d0d0f; border:1px solid #2a2018; border-top:none; padding:2.5rem 2rem;">

      <!-- Personal note -->
      <p style="font-size:1rem; line-height:1.8; color:#e8e0d0; margin:0 0 1.2rem;">
        Thank you for joining BattleSphere. This is a passion project — something I wanted to
        exist for a long time: a platform where gaming groups can give their armies and their battles
        a deeper narrative, and build ongoing stories in a shared imagined world. I&apos;m glad you&apos;re here.
      </p>
      <p style="font-size:0.9rem; color:#b78c40; margin:0 0 2.5rem; font-style:italic;">— Benjamin</p>

      <div style="border-top:1px solid #2a2018; margin-bottom:2.5rem;"></div>

      <!-- What is BattleSphere -->
      <h2 style="font-size:0.65rem; font-weight:700; letter-spacing:0.2em; text-transform:uppercase; color:#b78c40; margin:0 0 0.8rem;">
        What is BattleSphere?
      </h2>
      <p style="font-size:0.95rem; line-height:1.8; color:#c8bfa8; margin:0 0 2.5rem;">
        BattleSphere is a campaign platform for tabletop wargamers. It lets a group of players
        fight over an interactive map, earn territory, log their battles, and build a living
        chronicle — with factions, influence, events, and achievements all tracked in one place.
        It&apos;s system-agnostic, so it works with Warhammer 40,000, Age of Sigmar, or any other
        game you play.
      </p>

      <div style="border-top:1px solid #2a2018; margin-bottom:2.5rem;"></div>

      <!-- Join Austriacus -->
      <h2 style="font-size:0.65rem; font-weight:700; letter-spacing:0.2em; text-transform:uppercase; color:#b78c40; margin:0 0 0.6rem;">
        Join a live campaign
      </h2>
      <p style="font-size:0.95rem; line-height:1.7; color:#c8bfa8; margin:0 0 0.75rem;">
        To get you started, I&apos;ve set up an open narrative campaign called the
        <a href="${AUSTRIACUS_URL}" style="color:#b78c40; text-decoration:none; border-bottom:1px solid rgba(183,140,64,0.4);">Austriacus Subsector</a>
        — a contested region of space where factions are already fighting over
        territory. Anyone can join. Explore the map, pick a side, and see how the platform works in practice.
      </p>
      <div style="text-align:center; margin:1.5rem 0 2.5rem;">
        <a href="${inviteLink}"
           style="display:inline-block; padding:0.85rem 2.4rem; background:#b78c40; color:#07070a; border:1px solid #b78c40; text-decoration:none; font-size:0.75rem; font-weight:700; letter-spacing:0.16em; text-transform:uppercase;">
          Join the Austriacus Subsector &rarr;
        </a>
      </div>

      <div style="border-top:1px solid #2a2018; margin-bottom:2.5rem;"></div>

      <!-- Deploy an Army -->
      <h2 style="font-size:0.65rem; font-weight:700; letter-spacing:0.2em; text-transform:uppercase; color:#b78c40; margin:0 0 0.6rem;">
        Muster your forces
      </h2>
      <p style="font-size:0.95rem; line-height:1.7; color:#c8bfa8; margin:0 0 0.75rem;">
        BattleSphere also lets you build a permanent record of your army — units, photos, Crusade
        stats, and a public portfolio you can share. Create your first army and start tracking your
        forces&apos; history.
      </p>
      <div style="text-align:center; margin:1.5rem 0 2.5rem;">
        <a href="${APP_URL}/armies/new"
           style="display:inline-block; padding:0.8rem 2.2rem; background:transparent; color:#b78c40; border:1px solid #b78c40; text-decoration:none; font-size:0.75rem; font-weight:700; letter-spacing:0.16em; text-transform:uppercase;">
          Deploy your first Army &rarr;
        </a>
      </div>

      <div style="border-top:1px solid #2a2018; margin-bottom:2.5rem;"></div>

      <!-- What to do first -->
      <h2 style="font-size:0.65rem; font-weight:700; letter-spacing:0.2em; text-transform:uppercase; color:#b78c40; margin:0 0 1rem;">
        Three things to try first
      </h2>

      <div style="display:flex; gap:1rem; margin-bottom:1.2rem; align-items:flex-start;">
        <div style="min-width:2rem; height:2rem; border:1px solid #b78c40; color:#b78c40; font-size:0.7rem; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:0.1rem;">01</div>
        <div>
          <div style="font-size:0.85rem; font-weight:700; color:#e8e0d0; margin-bottom:0.2rem; letter-spacing:0.04em;">Explore the map</div>
          <div style="font-size:0.88rem; line-height:1.6; color:#a09880;">
            The campaign runs on an interactive star map. Click any world to see who controls it and what battles have been fought there.
          </div>
        </div>
      </div>

      <div style="display:flex; gap:1rem; margin-bottom:1.2rem; align-items:flex-start;">
        <div style="min-width:2rem; height:2rem; border:1px solid #b78c40; color:#b78c40; font-size:0.7rem; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:0.1rem;">02</div>
        <div>
          <div style="font-size:0.85rem; font-weight:700; color:#e8e0d0; margin-bottom:0.2rem; letter-spacing:0.04em;">Join a faction</div>
          <div style="font-size:0.88rem; line-height:1.6; color:#a09880;">
            Pick your side. Your battles, victories, and achievements will contribute to your faction&apos;s territorial influence across the subsector.
          </div>
        </div>
      </div>

      <div style="display:flex; gap:1rem; margin-bottom:2.5rem; align-items:flex-start;">
        <div style="min-width:2rem; height:2rem; border:1px solid #b78c40; color:#b78c40; font-size:0.7rem; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:0.1rem;">03</div>
        <div>
          <div style="font-size:0.85rem; font-weight:700; color:#e8e0d0; margin-bottom:0.2rem; letter-spacing:0.04em;">Log a battle</div>
          <div style="font-size:0.88rem; line-height:1.6; color:#a09880;">
            After your next game, record the result. It updates the map, earns influence for your faction, and adds an entry to the campaign chronicle.
          </div>
        </div>
      </div>

      <div style="border-top:1px solid #2a2018; margin-bottom:2rem;"></div>

      <p style="font-size:0.88rem; line-height:1.7; color:#a09880; margin:0;">
        Found a bug or have an idea?
        <a href="${APP_URL}" style="color:#b78c40; text-decoration:none; border-bottom:1px solid rgba(183,140,64,0.4);">Log in and use the feedback form in the top navigation</a>
        — every report helps make BattleSphere better.
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
