import { createClient } from '@/lib/supabase/server';
import { syncResendAudience } from '@/lib/resendAudience';

// Called by the client (modal / profile page) after a user changes their
// optin_platform_news preference. Updates the Resend Audience accordingly.
export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'Unauthorised.' }, { status: 401 });
    }

    const { optin } = await request.json();
    if (typeof optin !== 'boolean') {
      return Response.json({ error: 'optin must be a boolean.' }, { status: 400 });
    }

    await syncResendAudience(user.email, optin);
    return Response.json({ success: true });
  } catch (err) {
    console.error('sync-audience route error:', err);
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
