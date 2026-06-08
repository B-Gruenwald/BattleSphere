-- Migration: Add discord_invite_url to campaigns
-- This is a public invite link shown on the campaign dashboard.
-- Separate from discord_webhook_url (which is for posting notifications).
-- Run in Supabase SQL editor.

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS discord_invite_url TEXT;
