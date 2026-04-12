import { Resend } from 'resend';

/**
 * Sync a single email address with the Resend platform-newsletter Audience.
 * optin = true  → upsert as active subscriber
 * optin = false → upsert as unsubscribed (keeps history, Resend handles unsubscribe links)
 *
 * Non-fatal: logs errors but never throws so callers aren't broken by Resend issues.
 * Requires env var RESEND_AUDIENCE_ID to be set; silently no-ops if missing.
 */
export async function syncResendAudience(email, optin) {
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!audienceId) {
    console.warn('syncResendAudience: RESEND_AUDIENCE_ID not set — skipping');
    return;
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.contacts.create({
      audienceId,
      email,
      unsubscribed: !optin,
    });
  } catch (err) {
    console.error('syncResendAudience error:', err?.message ?? err);
  }
}
