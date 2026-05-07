-- Migration: add profile_public flag to profiles
-- Run this in the Supabase SQL Editor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS profile_public BOOLEAN NOT NULL DEFAULT true;

-- Index for fast lookups on the players directory (future use)
CREATE INDEX IF NOT EXISTS profiles_profile_public_idx ON profiles (profile_public);
