import { createClient } from '@supabase/supabase-js';

/**
 * Supabase admin client — uses the service role key to bypass RLS.
 * Only ever use this in server-side code (API routes, Server Components).
 * Never expose the service role key to the browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
