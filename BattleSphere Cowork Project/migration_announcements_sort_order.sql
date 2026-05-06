-- Migration: add sort_order to platform_announcements
-- Run in Supabase SQL editor before deploying.
-- Existing rows all default to 0 and will be ordered by created_at ASC as tiebreaker.

ALTER TABLE platform_announcements
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
