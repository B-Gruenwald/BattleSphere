import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Supabase auth callback — exchanges the one-time code for a real session,
 * then redirects the user into the app.
 *
 * Also handles first-time Discord OAuth sign-ups:
 *   - Sets username from Discord's 'name' field if profile has none
 *   - Applies default newsletter preferences
 *   - Fires the welcome email
 */
export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              try { cookieStore.set(name, value, options); } catch {}
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const url = new URL('/login', requestUrl.origin);
      url.searchParams.set('error', 'confirmation_failed');
      return NextResponse.redirect(url);
    }

    // ── New Discord user setup ───────────────────────────────────────────────
    // Check if this is a brand-new Discord sign-up (created within the last
    // 3 minutes — reliably distinguishes first login from returning users).
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const isDiscord = user?.app_metadata?.provider === 'discord';
      const isNew = user?.created_at &&
        (Date.now() - new Date(user.created_at).getTime()) < 3 * 60 * 1000;

      if (user && isDiscord && isNew) {
        // Discord puts the username in user_metadata.name (or full_name)
        const discordName =
          user.user_metadata?.name ||
          user.user_metadata?.full_name ||
          null;

        // Set username on profile if the trigger left it null
        if (discordName) {
          await supabase
            .from('profiles')
            .update({ username: discordName })
            .eq('id', user.id)
            .is('username', null);
        }

        // Apply default newsletter preferences (only if never set before)
        await supabase
          .from('profiles')
          .update({
            optin_platform_news:    true,
            optin_campaign_digests: true,
            digest_frequency:       'weekly',
          })
          .eq('id', user.id)
          .is('optin_platform_news', null);

        // Fire welcome email — non-blocking, errors are swallowed
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin;
        fetch(`${appUrl}/api/send-welcome-email`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            email:    user.email,
            username: discordName || user.email,
          }),
        }).catch(() => {});
      }
    } catch (_) {
      // Non-fatal — never block the redirect because of setup errors
    }
    // ────────────────────────────────────────────────────────────────────────
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
