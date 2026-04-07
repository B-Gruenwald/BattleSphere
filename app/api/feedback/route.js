import { createClient }      from '@/lib/supabase/server';
import { Resend }            from 'resend';

const FEEDBACK_RECIPIENT = process.env.FEEDBACK_RECIPIENT_EMAIL ?? 'benjamin.gruenwald@gmail.com';

export async function POST(request) {
  try {
    // ── 1. Parse body ────────────────────────────────────────────────────────
    const { type, page, description, username } = await request.json();

    if (!description?.trim()) {
      return Response.json({ error: 'Description is required.' }, { status: 400 });
    }

    // ── 2. Confirm the user is logged in (light auth check) ──────────────────
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: 'You must be logged in to submit feedback.' }, { status: 401 });
    }

    // ── 3. Send email via Resend ─────────────────────────────────────────────
    const resend        = new Resend(process.env.RESEND_API_KEY);
    const fromAddr      = process.env.RESEND_FROM_EMAIL;
    const typeLabel     = type === 'feature' ? '💡 Feature Request' : '🐛 Bug Report';
    const typeBadgeColor = type === 'feature' ? '#6a8fc7' : '#e05a5a';
    const senderName    = username || user.email || 'Unknown user';
    const pageLabel     = page?.trim() || 'Not specified';

    const { error: emailError } = await resend.emails.send({
      from:    fromAddr,
      to:      FEEDBACK_RECIPIENT,
      subject: `${typeLabel} from ${senderName} — ${pageLabel}`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #0d0d0f; color: #e8e0d0; padding: 2rem; border: 1px solid #4a3a1a;">

          <h2 style="color: #b78c40; font-size: 1.3rem; margin: 0 0 0.3rem; letter-spacing: 0.05em;">
            BattleSphere Feedback
          </h2>
          <p style="color: #666; font-size: 0.8rem; margin: 0 0 2rem;">
            Submitted by <strong style="color: #a09880;">${senderName}</strong>
          </p>

          <!-- Type badge -->
          <div style="margin-bottom: 1.5rem;">
            <span style="
              display: inline-block;
              padding: 0.25rem 0.75rem;
              border: 1px solid ${typeBadgeColor};
              color: ${typeBadgeColor};
              font-family: monospace;
              font-size: 0.8rem;
              letter-spacing: 0.1em;
              text-transform: uppercase;
            ">
              ${typeLabel}
            </span>
          </div>

          <!-- Page -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 1.5rem;">
            <tr>
              <td style="
                padding: 0.6rem 0.9rem;
                background: rgba(255,255,255,0.03);
                border: 1px solid #2a2a2a;
                color: #b78c40;
                font-family: monospace;
                font-size: 0.75rem;
                letter-spacing: 0.1em;
                text-transform: uppercase;
                width: 120px;
                white-space: nowrap;
              ">
                Page
              </td>
              <td style="
                padding: 0.6rem 0.9rem;
                background: rgba(255,255,255,0.02);
                border: 1px solid #2a2a2a;
                color: #e8e0d0;
                font-size: 0.95rem;
              ">
                ${pageLabel}
              </td>
            </tr>
          </table>

          <!-- Description -->
          <div style="margin-bottom: 2rem;">
            <div style="
              font-family: monospace;
              font-size: 0.7rem;
              letter-spacing: 0.12em;
              text-transform: uppercase;
              color: #b78c40;
              margin-bottom: 0.5rem;
            ">
              ${type === 'feature' ? 'Requested Feature' : 'Bug Description'}
            </div>
            <div style="
              background: rgba(255,255,255,0.03);
              border: 1px solid #2a2a2a;
              border-left: 3px solid ${typeBadgeColor};
              padding: 1rem 1.2rem;
              font-size: 0.95rem;
              line-height: 1.7;
              color: #e8e0d0;
              white-space: pre-wrap;
            ">
${description.trim()}
            </div>
          </div>

          <p style="color: #444; font-size: 0.75rem; border-top: 1px solid #2a2a2a; padding-top: 1rem; margin: 0;">
            User ID: ${user.id} · Submitted via BattleSphere feedback form
          </p>
        </div>
      `,
    });

    if (emailError) {
      console.error('Resend feedback email error:', emailError);
      return Response.json({ error: 'Could not send your feedback. Please try again.' }, { status: 500 });
    }

    return Response.json({ success: true });

  } catch (err) {
    console.error('Feedback route error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
