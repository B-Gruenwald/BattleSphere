import { createClient }      from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Resend }            from 'resend';

export async function POST(request) {
  try {
    const { campaignId } = await request.json();
    if (!campaignId) {
      return Response.json({ error: 'campaignId is required' }, { status: 400 });
    }

    // ── 1. Authenticate the requesting user ──────────────────────────────────
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'You must be logged in to request access.' }, { status: 401 });
    }

    // ── 2. Insert the join request ───────────────────────────────────────────
    const { data: inserted, error: insertError } = await supabase
      .from('join_requests')
      .insert({ campaign_id: campaignId, user_id: user.id, status: 'pending' })
      .select();

    if (insertError) {
      // Unique constraint → user already has a request for this campaign
      if (insertError.code === '23505') {
        return Response.json({ error: 'You have already requested to join this campaign.' }, { status: 409 });
      }
      console.error('join_requests insert error:', insertError);
      return Response.json({ error: 'Could not save your request. Please try again.' }, { status: 500 });
    }

    // ── 3. Fetch campaign name, slug, and organiser_id ───────────────────────
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('name, slug, organiser_id')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      // Request saved — just skip the email
      console.error('Could not fetch campaign for email:', campaignError);
      return Response.json({ success: true });
    }

    // ── 4. Fetch requester's username ────────────────────────────────────────
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    const requesterName = requesterProfile?.username ?? 'A player';

    // ── 5. Fetch organiser's email via admin client (bypasses RLS on auth.users) ──
    const admin = createAdminClient();
    const { data: { user: organiser }, error: organiserError } =
      await admin.auth.admin.getUserById(campaign.organiser_id);

    if (organiserError || !organiser?.email) {
      // Request saved — just skip the email
      console.error('Could not fetch organiser email:', organiserError);
      return Response.json({ success: true });
    }

    // ── 6. Send notification email via Resend ────────────────────────────────
    const resend   = new Resend(process.env.RESEND_API_KEY);
    const fromAddr = process.env.RESEND_FROM_EMAIL;
    const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.battlesphere.cc';
    const requestsUrl = `${appUrl}/c/${campaign.slug}/requests`;

    const { error: emailError } = await resend.emails.send({
      from:    fromAddr,
      to:      organiser.email,
      subject: `⚔️ New join request for ${campaign.name}`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #0d0d0f; color: #e8e0d0; padding: 2rem; border: 1px solid #4a3a1a;">
          <h2 style="color: #b78c40; font-size: 1.4rem; margin-bottom: 0.5rem; letter-spacing: 0.05em;">
            ⚔️ New Join Request
          </h2>
          <p style="color: #a09880; font-size: 0.9rem; margin-bottom: 1.5rem;">
            BattleSphere Campaign Management
          </p>

          <p style="font-size: 1rem; line-height: 1.6;">
            <strong style="color: #b78c40;">${requesterName}</strong> has requested to join your campaign
            <strong style="color: #b78c40;">${campaign.name}</strong>.
          </p>

          <div style="margin: 2rem 0; text-align: center;">
            <a href="${requestsUrl}"
               style="display: inline-block; padding: 0.75rem 2rem;
                      background: transparent; color: #b78c40;
                      border: 1px solid #b78c40;
                      text-decoration: none; font-size: 0.9rem;
                      letter-spacing: 0.1em; text-transform: uppercase;">
              Review Request →
            </a>
          </div>

          <p style="color: #666; font-size: 0.8rem; border-top: 1px solid #2a2a2a; padding-top: 1rem; margin-top: 2rem;">
            You are receiving this because you are the organiser of <em>${campaign.name}</em> on BattleSphere.
          </p>
        </div>
      `,
    });

    if (emailError) {
      // Request saved — just log the email failure, don't surface to user
      console.error('Resend error:', emailError);
    }

    return Response.json({ success: true });

  } catch (err) {
    console.error('join-request route error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
