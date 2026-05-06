-- Add sent_at tracking to platform_announcements
-- Run this in the Supabase SQL editor

ALTER TABLE platform_announcements
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
