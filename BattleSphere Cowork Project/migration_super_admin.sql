-- ─────────────────────────────────────────────────────────────
-- Super-Admin Migration
-- Adds is_admin flag to profiles and grants it to Benjamin's account.
-- Run once in the Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────

-- 1. Add is_admin column (safe to run multiple times)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- 2. Grant super-admin to Benjamin's account
UPDATE profiles
SET is_admin = true
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'benjamin.gruenwald@gmail.com'
);
