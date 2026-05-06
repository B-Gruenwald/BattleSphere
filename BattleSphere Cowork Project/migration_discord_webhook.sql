-- Discord webhook integration: add webhook URL to campaigns
-- Run in the Supabase SQL editor.

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS discord_webhook_url TEXT;
