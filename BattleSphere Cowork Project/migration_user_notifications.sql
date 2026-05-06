-- ── user_notifications ────────────────────────────────────────────────────────
-- In-app notification inbox for all registered users.
-- Notifications are inserted via the admin client (bypasses RLS).
-- Users can only read and update-read their own notifications.

CREATE TABLE IF NOT EXISTS user_notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  body        TEXT,
  link        TEXT,
  is_read     BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata    JSONB
);

-- Fast lookup: all unread notifications for a user, newest first
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread
  ON user_notifications (user_id, is_read, created_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "users can read own notifications"
  ON user_notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
CREATE POLICY "users can update own notifications"
  ON user_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role (admin client) can insert notifications on behalf of the system
-- No authenticated INSERT policy — all inserts use createAdminClient()


-- ── campaign_events.notif_sent_at ─────────────────────────────────────────────
-- Tracks whether the daily event-live cron has already notified members.
-- NULL = not yet sent. Stamped by the cron after successful notification.

ALTER TABLE campaign_events
  ADD COLUMN IF NOT EXISTS notif_sent_at TIMESTAMPTZ DEFAULT NULL;
