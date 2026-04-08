import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Supabase auth callback — exchanges the one-time code in the confirmation
 * email for a real session, then redirects the user into the app.
 *
 * Supabase sends confirmation emails to:
 *   https://battle-sphere-topaz.vercel.app/auth/callback?code=...&next=/dashboard
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
      // Exchange failed — redirect to login with an error hint
      const url = new URL('/login', requestUrl.origin);
      url.searchParams.set('error', 'confirmation_failed');
      return NextResponse.redirect(url);
    }
  }

  // Successful — send the user to dashboard (or wherever they were headed)
  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
