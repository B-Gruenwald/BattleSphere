# BattleSphere — Session Handoff
**Date:** 2026-04-12  
**Project:** BattleSphere — https://www.battlesphere.cc  
**Local code:** `/Users/benjamingrunwald/Desktop/BattleSphere`  
**Stack:** Next.js 16.2, React 19, Tailwind CSS v4, Supabase, Vercel (auto-deploy on push)  
**Rules:** All files `.js` only (no TypeScript). Use `select('*')` for Supabase. Event handlers must be in `'use client'` components.

---

## What was built this session

### 1. Full Newsletter System (two-tier, unified digest)

**Database** — `BattleSphere Cowork Project/migration_newsletter.sql` (already run ✓):
- Added to `profiles`: `optin_platform_news`, `optin_campaign_digests`, `digest_frequency`, `last_digest_sent_at`
- Added to `campaign_members`: `include_in_digest`
- Created `platform_announcements` table (admin queues platform-level news)
- Created `campaign_digest_messages` table (organiser queues campaign messages)
- RLS policies on both new tables

**`lib/resendAudience.js`** — utility to sync email with Resend Audience (silently no-ops if `RESEND_AUDIENCE_ID` not set)

**`app/components/NewsletterOptinModal.js`** — centre modal for existing users who never opted in:
- 'use client', self-fetches on mount via Supabase browser client
- Shows if `optin_platform_news == null || optin_campaign_digests == null` (uses `==` not `===` — critical, Supabase returns `undefined` for new columns)
- Two independent toggle rows for platform news vs campaign updates
- Frequency selector (weekly / fortnightly / monthly) shown when either optin is on
- "Save preferences" → writes to profiles + calls sync-audience API
- "Not now" → saves `false` for both, shows "you can change this in /profile/notifications", closes after 4.5s
- No dismiss-on-overlay-click
- Added to `app/layout.js` so it runs everywhere (before `<main>`)

**`app/register/page.js`** — added newsletter opt-in to registration form:
- State: `optinCampaigns`, `optinPlatform`, `digestFrequency` (all pre-ticked)
- Two checkboxes + frequency button row inserted between password field and submit
- After sign-up, updates profiles row with optin values + calls sync-audience API

**`app/profile/notifications/page.js`** + **`NotificationPreferencesForm.js`** — /profile/notifications preferences page:
- Server page fetches profile + campaign memberships
- Client form: toggle for platform news, toggle for campaign digests, per-campaign `include_in_digest` toggle, frequency button group
- Saves to profiles + campaign_members + calls sync-audience

**`app/components/OrganiserDigestMessage.js`** — organiser queues campaign digest messages (no "send now" to prevent spam):
- Max 400 chars, shows char count
- Lists queued messages with Remove button
- Messages are included in any digest where `created_at > last_digest_sent_at`

**`app/c/[slug]/admin/page.js`** — added "Campaign Digest" section for organiser message queue

**`app/admin/announcements/page.js`** + **`AnnouncementsForm.js`** — admin-only page for Benjamin to queue platform announcements. Accessible from admin overview page via "Platform Announcements →" button.

**`app/admin/page.js`** — added auth guard (redirect if not admin) + "Platform Announcements →" link

**`app/api/newsletter/sync-audience/route.js`** — auth-required POST endpoint, calls syncResendAudience with user's email and optin bool

**`app/api/cron/campaign-digest/route.js`** — daily digest cron:
- Secured with `Authorization: Bearer CRON_SECRET` header
- Fetches eligible profiles (both optins considered, frequency threshold elapsed)
- Gets user email via `supabase.auth.admin.getUserById(profile.id)` (profiles table has no email column — must use admin API)
- Collects platform announcements + per-campaign sections (org messages, bulletins, events) since `last_digest_sent_at`
- Skips send if nothing to report
- Sends via Resend, updates `last_digest_sent_at`
- Returns `{ sent, errors }`

**`vercel.json`** — created at project root to register cron:
```json
{ "crons": [{ "path": "/api/cron/campaign-digest", "schedule": "0 8 * * *" }] }
```
Cron visible in Vercel → Settings → Cron Jobs. No trigger button on Hobby plan — test via browser console fetch with CRON_SECRET.

**Email designs** (approved):
- `BattleSphere Cowork Project/email_digest_mockup.html` — dark header, white body, gold accents, "Current Events" section (not "Upcoming Events" — no events pipeline yet)
- `BattleSphere Cowork Project/email_campaign_launch_mockup.html` — campaign launch email, same styling

---

### 2. Campaign Launch Email — sent to all 12 users

**`app/api/admin/send-campaign-launch/route.js`** — admin-only POST with three modes:
- `{ testEmail: '...' }` → test send to single address
- `{ emails: ['...', '...'] }` → targeted resend to specific addresses (for fixing rate-limit failures)
- `{ sendToAll: true }` → sends to all users (paginated, 1000/page)

600ms delay between sends to respect Resend free tier (2 emails/sec). Fetches usernames from profiles for personalised greeting. Subject: "The Campaign for the Austriacus Subsector has begun".

**Email deliverability fix** — email was landing in spam on GMX. Root causes:
1. Missing SPF record: added `v=spf1 include:_spf.resend.com ~all` TXT on `@` in Cloudflare
2. Duplicate `_dmarc` record: deleted the duplicate
3. DKIM was already present

After fixes, email landed in inbox. All 12 users received the campaign launch email.

---

## Pending tasks (in priority order)

1. **Run SQL migration** — Execute `migration_bulletin_public_read.sql` in Supabase to enable bulletin display on public campaign pages (may already be done — confirm in Supabase)
2. **Influence Tier 1** — selectable influence modes per campaign
3. **Influence Tier 2** — event-linked mission bonuses (needs `mission_type` field on battle log)
4. **Influence Tier 3** — cascade influence via warp routes
5. **Campaign Bulletin design** — approved design documented in `project_bulletin_design.md`, estimated ready ~2026-04-14

---

## Standard project rules (always apply)
- All files `.js` only — never `.tsx` or TypeScript syntax
- Always use `select('*')` for Supabase queries
- Avoid `.maybeSingle()` — use `.limit(1)` and `?.[0] ?? null` instead
- Event handlers must be in `'use client'` components
- Campaign roles: `'player'`, `'organiser'`, `'admin'` (lowercase); legacy `'Organiser'` (capital O) also exists in some DB rows — check for both
- Faction detail URL: `/c/[slug]/faction/[id]` (singular) — not `/factions/[id]`
- Git remote has GitHub token embedded — `git push` works directly from terminal
- If `git commit` fails with HEAD.lock: request Cowork file delete permission, then `rm -f .git/HEAD.lock`
- Step components in Create Campaign wizard must be called as functions `Step1()` not `<Step1 />`
- `createAdminClient()` (service role) is required for any server-side operation that needs to bypass RLS or access auth.users emails
- The BattleSphere code folder is at `/Users/benjamingrunwald/Desktop/BattleSphere` — must be mounted separately from the "BattleSphere Cowork Project" outputs folder
- `profiles` table has NO email column — email lives in `auth.users`; use `supabase.auth.admin.getUserById(id)` server-side to fetch it
- Supabase newly-added columns return `undefined` (not `null`) in JS — always use `== null` (loose equality) when checking if a column has never been set
