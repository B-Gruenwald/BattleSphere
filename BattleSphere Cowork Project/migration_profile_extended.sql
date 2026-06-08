-- Migration: extended public profile fields
-- Run this in the Supabase SQL Editor

-- Personal introduction / bio
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio TEXT;

-- Discord handle (e.g. "username" or "username#1234")
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS discord_handle TEXT;

-- Game systems the player plays (array of strings, e.g. '{"Kill Team","Warhammer 40,000"}')
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS game_systems TEXT[] DEFAULT '{}';

-- Hobby focus tags (e.g. '{"Narrative Player","Painter First"}')
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS hobby_tags TEXT[] DEFAULT '{}';

-- Social / hobby links (JSON object: { "website": "...", "instagram": "..." })
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';

-- Banner image URL (Cloudinary)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS banner_image_url TEXT;

-- Profile visibility: 'public' | 'members' | 'allies'
-- public  = anyone including logged-out visitors
-- members = any registered BattleSphere user
-- allies  = only users who share a campaign or league with this user
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS profile_visibility TEXT NOT NULL DEFAULT 'public'
  CHECK (profile_visibility IN ('public', 'members', 'allies'));

-- Back-fill existing rows:
--   profile_public = true  → 'public'
--   profile_public = false → 'members'  (was "private", closest safe equivalent)
UPDATE profiles
  SET profile_visibility = CASE
    WHEN profile_public = false THEN 'members'
    ELSE 'public'
  END
WHERE profile_visibility = 'public';  -- only touch rows not yet set

-- Index for fast visibility lookups
CREATE INDEX IF NOT EXISTS profiles_visibility_idx ON profiles (profile_visibility);
