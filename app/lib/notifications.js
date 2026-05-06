/**
 * Notification utility — server-side only.
 *
 * All inserts use the admin client so they bypass RLS.
 * Import createAdminClient at the call site and pass it in,
 * or call createNotification() which creates its own admin client.
 */

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Insert a single notification for a user.
 *
 * @param {string} userId   - UUID of the recipient (must exist in profiles)
 * @param {object} payload
 *   @param {string}  payload.type     - Notification type key (see TYPES below)
 *   @param {string}  payload.title    - Short headline shown in the bell dropdown
 *   @param {string}  [payload.body]   - Optional longer description
 *   @param {string}  [payload.link]   - Optional URL to navigate to on click
 *   @param {object}  [payload.metadata] - Optional JSONB for type-specific extras
 *
 * Errors are swallowed — notifications must never block the main action.
 */
export async function createNotification(userId, { type, title, body, link, metadata } = {}) {
  if (!userId || !type || !title) return;
  try {
    const admin = createAdminClient();
    await admin.from('user_notifications').insert({
      user_id:  userId,
      type,
      title,
      body:     body    ?? null,
      link:     link    ?? null,
      metadata: metadata ?? null,
    });
  } catch (err) {
    console.error('[notifications] createNotification error:', err);
  }
}

/**
 * Insert the same notification for multiple users at once (bulk).
 * Useful for campaign-wide notifications (events, weekly reports).
 *
 * @param {string[]} userIds
 * @param {object}   payload  — same shape as createNotification payload
 */
export async function createNotificationForMany(userIds, payload) {
  if (!userIds?.length || !payload?.type || !payload?.title) return;
  try {
    const admin = createAdminClient();
    const rows = userIds.map(uid => ({
      user_id:  uid,
      type:     payload.type,
      title:    payload.title,
      body:     payload.body     ?? null,
      link:     payload.link     ?? null,
      metadata: payload.metadata ?? null,
    }));
    await admin.from('user_notifications').insert(rows);
  } catch (err) {
    console.error('[notifications] createNotificationForMany error:', err);
  }
}

// ── Notification type constants ───────────────────────────────────────────────
export const NOTIF_TYPES = {
  BATTLE_OPPONENT:       'battle_opponent',
  ACHIEVEMENT_AWARDED:   'achievement_awarded',
  WEEKLY_REPORT:         'weekly_report',
  EVENT_LIVE:            'event_live',
  CAMPAIGN_JOINED:       'campaign_joined',
  ONBOARDING_WELCOME:    'onboarding_welcome',
  ONBOARDING_CAMPAIGN:   'onboarding_campaign',
  ONBOARDING_ARMY:       'onboarding_army',
};

// ── Icon / colour mapping (used by UI components) ─────────────────────────────
// Each type maps to a display config. Imported by NotificationBell and inbox page.
export const NOTIF_CONFIG = {
  battle_opponent: {
    icon:   '⚔️',
    colour: '#e05a5a',
    label:  'Battle',
  },
  achievement_awarded: {
    icon:   '🏆',
    colour: '#b78c40',
    label:  'Achievement',
  },
  weekly_report: {
    icon:   '📜',
    colour: '#7a9e7e',
    label:  'Weekly Report',
  },
  event_live: {
    icon:   '⚡',
    colour: '#6b9ecf',
    label:  'Campaign Event',
  },
  onboarding_welcome: {
    icon:   '🌌',
    colour: '#b78c40',
    label:  'Welcome',
  },
  onboarding_campaign: {
    icon:   '🗺️',
    colour: '#b78c40',
    label:  'Getting Started',
  },
  onboarding_army: {
    icon:   '🛡️',
    colour: '#b78c40',
    label:  'Getting Started',
  },
  campaign_joined: {
    icon:   '🏴',
    colour: '#7a9e7e',
    label:  'Campaign',
  },
};
