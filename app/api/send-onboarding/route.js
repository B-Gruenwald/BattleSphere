import { createClient }      from '@/lib/supabase/server';
import { Resend }            from 'resend';

const CAMPAIGN_URL = 'https://www.battlesphere.cc/campaign/austriacus-subsector-93n4g';
const APP_URL      = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.battlesphere.cc';

export async function POST(request) {
  try {
    // ── 1. Verify caller is a super-admin ────────────────────────────────────
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

    // ── 2. Parse body ────────────────────────────────────────────────────────
    const { to, inviteLink } = await request.json();
    if (!to || !inviteLink) {
      return Response.json({ error: 'Recipient email and invite link are required.' }, { status: 400 });
    }

    // ── 3. Send email via Resend ─────────────────────────────────────────────
    const resend   = new Resend(process.env.RESEND_API_KEY);
    const fromAddr = process.env.RESEND_FROM_EMAIL;

    const { error: emailError } = await resend.emails.send({
      from:    fromAddr,
      to:      to.trim(),
      subject: 'Welcome to BattleSphere — here\'s how to get started',
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to BattleSphere</title>
</head>
<body style="margin:0; padding:0; background:#07070a; font-family: Georgia, 'Times New Roman', serif;">

  <div style="max-width:620px; margin:0 auto; padding:2rem 1rem;">

    <!-- ── Header ── -->
    <div style="text-align:center; padding:2.5rem 2rem 2rem; border-bottom:1px solid #2a2018;">
      <div style="
        font-size:0.65rem;
        font-weight:700;
        letter-spacing:0.28em;
        text-transform:uppercase;
        color:#b78c40;
        margin-bottom:0.6rem;
      ">⚔ &nbsp; Battle Sphere &nbsp; ⚔</div>
      <div style="
        font-size:2rem;
        font-weight:700;
        letter-spacing:0.08em;
        text-transform:uppercase;
        color:#e8e0d0;
        line-height:1.1;
      ">Welcome, Commander</div>
    </div>

    <!-- ── Main card ── -->
    <div style="background:#0d0d0f; border:1px solid #2a2018; border-top:none; padding:2.5rem 2rem;">

      <!-- Personal note -->
      <p style="font-size:1rem; line-height:1.8; color:#e8e0d0; margin:0 0 1.4rem;">
        Thank you for wanting to join BattleSphere! This is a passion project for me — something I wanted to
        see exist for a while now: a platform where we as a gaming community can give our armies and our games
        a deeper narrative, and build ongoing stories in a shared imagined world. I'm incredibly excited to
        see it come to life, and I hope you'll enjoy it as much as I do.
      </p>
      <p style="font-size:0.9rem; color:#b78c40; margin:0 0 2.5rem; font-style:italic;">— Benjamin</p>

      <!-- Divider -->
      <div style="border-top:1px solid #2a2018; margin-bottom:2.5rem;"></div>

      <!-- What is BattleSphere -->
      <h2 style="
        font-size:0.65rem;
        font-weight:700;
        letter-spacing:0.2em;
        text-transform:uppercase;
        color:#b78c40;
        margin:0 0 0.8rem;
      ">What is BattleSphere?</h2>
      <p style="font-size:0.95rem; line-height:1.8; color:#c8bfa8; margin:0 0 2.5rem;">
        BattleSphere is a campaign platform for tabletop wargamers. It lets a group of players fight over an
        interactive map, earn territory, log their battles, and build a living chronicle of their campaign —
        with factions, influence, events, and achievements all tracked in one place. It's system-agnostic,
        so it works with Warhammer 40,000, Age of Sigmar, or any other game you play.
      </p>

      <!-- Divider -->
      <div style="border-top:1px solid #2a2018; margin-bottom:2.5rem;"></div>

      <!-- Step 1 -->
      <h2 style="
        font-size:0.65rem;
        font-weight:700;
        letter-spacing:0.2em;
        text-transform:uppercase;
        color:#b78c40;
        margin:0 0 0.6rem;
      ">Step 1 — Create your account</h2>
      <p style="font-size:0.95rem; line-height:1.7; color:#c8bfa8; margin:0 0 1.2rem;">
        Register for free. No subscription, no catch — just your name and a password.
      </p>
      <div style="text-align:center; margin:0 0 2.5rem;">
        <a href="${APP_URL}/register"
           style="
             display:inline-block;
             padding:0.8rem 2.2rem;
             background:transparent;
             color:#b78c40;
             border:1px solid #b78c40;
             text-decoration:none;
             font-size:0.75rem;
             font-weight:700;
             letter-spacing:0.16em;
             text-transform:uppercase;
           ">
          Register Now &rarr;
        </a>
      </div>

      <!-- Divider -->
      <div style="border-top:1px solid #2a2018; margin-bottom:2.5rem;"></div>

      <!-- Step 2 -->
      <h2 style="
        font-size:0.65rem;
        font-weight:700;
        letter-spacing:0.2em;
        text-transform:uppercase;
        color:#b78c40;
        margin:0 0 0.6rem;
      ">Step 2 — Join the demo campaign</h2>
      <p style="font-size:0.95rem; line-height:1.7; color:#c8bfa8; margin:0 0 0.5rem;">
        I've set up a demo campaign called the
        <a href="${CAMPAIGN_URL}"
           style="color:#b78c40; text-decoration:none; border-bottom:1px solid rgba(183,140,64,0.4);">
          Austriacus Subsector
        </a>
        so you can explore the platform straight away. Use your personal invite link below to join:
      </p>
      <div style="text-align:center; margin:1.2rem 0 2.5rem;">
        <a href="${inviteLink}"
           style="
             display:inline-block;
             padding:0.8rem 2.2rem;
             background:#b78c40;
             color:#07070a;
             border:1px solid #b78c40;
             text-decoration:none;
             font-size:0.75rem;
             font-weight:700;
             letter-spacing:0.16em;
             text-transform:uppercase;
           ">
          Join the Austriacus Subsector &rarr;
        </a>
      </div>

      <!-- Divider -->
      <div style="border-top:1px solid #2a2018; margin-bottom:2.5rem;"></div>

      <!-- First steps -->
      <h2 style="
        font-size:0.65rem;
        font-weight:700;
        letter-spacing:0.2em;
        text-transform:uppercase;
        color:#b78c40;
        margin:0 0 1rem;
      ">What to do first</h2>

      <!-- Step row: Explore the map -->
      <div style="display:flex; gap:1rem; margin-bottom:1.2rem; align-items:flex-start;">
        <div style="
          min-width:2rem; height:2rem;
          border:1px solid #b78c40;
          color:#b78c40;
          font-size:0.7rem;
          font-weight:700;
          display:flex; align-items:center; justify-content:center;
          flex-shrink:0;
          margin-top:0.1rem;
        ">01</div>
        <div>
          <div style="font-size:0.85rem; font-weight:700; color:#e8e0d0; margin-bottom:0.2rem; letter-spacing:0.04em;">
            Explore the map
          </div>
          <div style="font-size:0.88rem; line-height:1.6; color:#a09880;">
            The campaign runs on an interactive star map. Click any world to see who controls it and
            what battles have been fought there.
          </div>
        </div>
      </div>

      <!-- Step row: Join a faction -->
      <div style="display:flex; gap:1rem; margin-bottom:1.2rem; align-items:flex-start;">
        <div style="
          min-width:2rem; height:2rem;
          border:1px solid #b78c40;
          color:#b78c40;
          font-size:0.7rem;
          font-weight:700;
          display:flex; align-items:center; justify-content:center;
          flex-shrink:0;
          margin-top:0.1rem;
        ">02</div>
        <div>
          <div style="font-size:0.85rem; font-weight:700; color:#e8e0d0; margin-bottom:0.2rem; letter-spacing:0.04em;">
            Join a faction
          </div>
          <div style="font-size:0.88rem; line-height:1.6; color:#a09880;">
            Pick your side. Your battles, victories, and achievements will contribute to your faction's
            territorial influence across the subsector.
          </div>
        </div>
      </div>

      <!-- Step row: Log a battle -->
      <div style="display:flex; gap:1rem; margin-bottom:2.5rem; align-items:flex-start;">
        <div style="
          min-width:2rem; height:2rem;
          border:1px solid #b78c40;
          color:#b78c40;
          font-size:0.7rem;
          font-weight:700;
          display:flex; align-items:center; justify-content:center;
          flex-shrink:0;
          margin-top:0.1rem;
        ">03</div>
        <div>
          <div style="font-size:0.85rem; font-weight:700; color:#e8e0d0; margin-bottom:0.2rem; letter-spacing:0.04em;">
            Log a battle
          </div>
          <div style="font-size:0.88rem; line-height:1.6; color:#a09880;">
            After your next game, record the result. It updates the map, earns influence for your
            faction, and adds an entry to the campaign chronicle.
          </div>
        </div>
      </div>

      <!-- Divider -->
      <div style="border-top:1px solid #2a2018; margin-bottom:2rem;"></div>

      <!-- Bug reports -->
      <p style="font-size:0.88rem; line-height:1.7; color:#a09880; margin:0;">
        Found a bug or have an idea?
        <a href="${APP_URL}"
           style="color:#b78c40; text-decoration:none; border-bottom:1px solid rgba(183,140,64,0.4);">
          Log in and use the feedback form in the top navigation
        </a>
        — every report helps make BattleSphere better.
      </p>

    </div>

    <!-- ── Footer ── -->
    <div style="text-align:center; padding:1.5rem 2rem; border-top:none;">
      <div style="
        font-size:0.6rem;
        letter-spacing:0.2em;
        text-transform:uppercase;
        color:#3a3020;
        margin-bottom:0.4rem;
      ">⚔ &nbsp; BattleSphere &nbsp; ⚔</div>
      <a href="${APP_URL}"
         style="font-size:0.75rem; color:#4a3a1a; text-decoration:none; letter-spacing:0.06em;">
        battlesphere.cc
      </a>
    </div>

  </div>
</body>
</html>
      `,
    });

    if (emailError) {
      console.error('Resend onboarding email error:', emailError);
      return Response.json({ error: 'Email could not be sent. Check Resend logs.' }, { status: 500 });
    }

    return Response.json({ success: true });

  } catch (err) {
    console.error('send-onboarding route error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
