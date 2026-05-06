-- Discord OAuth support: update handle_new_user() trigger
-- Run this in the Supabase SQL editor.
--
-- Discord OAuth sets raw_user_meta_data->>'name' (not 'username'),
-- so the trigger needs a fallback chain:
--   1. 'username'  (email sign-up)
--   2. 'name'      (Discord / other OAuth providers)
--   3. local part of email (last resort)
--
-- IMPORTANT: If your handle_new_user() trigger inserts additional columns
-- beyond (id, username), add those columns back in the INSERT below.
-- You can check the current function body in Supabase:
--   Dashboard → Database → Functions → handle_new_user

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'username', ''),
      NULLIF(NEW.raw_user_meta_data->>'name',     ''),
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
