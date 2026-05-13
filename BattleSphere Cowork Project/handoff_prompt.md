# BattleSphere — Session Handoff Prompt

## Who I am
I'm Benjamin Grünwald, a Warhammer 40,000 hobbyist with limited coding skills. I'm building **BattleSphere** — a system-agnostic narrative wargaming campaign platform — using Claude to write all the code. I make product decisions and test; Claude implements. Keep explanations non-technical where possible.

---

## Platform & access

### Live site
- **URL**: https://www.battlesphere.cc (primary) — also accessible at https://battle-sphere-topaz.vercel.app
- **Hosting**: Vercel (auto-deploys from GitHub on push to `main`)
- **GitHub repo**: https://github.com/B-Gruenwald/BattleSphere

### Local code
- **Folder**: `/Users/benjamingrunwald/Desktop/BattleSphere` — request access at the start of every session with `request_cowork_directory: ~/Desktop/BattleSphere`
- **Cowork project folder** (for deliverables like SQL migrations): `/Users/benjamingrunwald/Desktop/BattleSphere/BattleSphere Cowork Project`

### Stack
- Next.js 16.2, React 19, Tailwind CSS v4, @supabase/supabase-js, @supabase/ssr, Resend, Cloudinary
- **All files use `.js`** — never `.tsx` or TypeScript.

### Email (Resend)
- Domain `battlesphere.cc` verified in Resend (region: Ireland eu-west-1)
- All emails send from `BattleSphere <noreply@battlesphere.cc>`
- `RESEND_FROM_EMAIL` and `NEXT_PUBLIC_APP_URL` set in Vercel env vars
- Supabase auth emails routed via Resend SMTP

---

## Current git state

**Last commit**: `cf7746d` — `Admin overhaul: distribute tools to sub-pages + UI improvements`

```
cf7746d  Admin overhaul: distribute tools to sub-pages + UI improvements
54c1b0e  (previous session commits)
797f1f5  feat: show metadata tip buttons in bell dropdown preview
68103eb  fix: measure bell button rect (not container) for dropdown positioning
4e3f62a  fix: notification dropdown uses fixed viewport positioning
20587df  feat: in-app notification inbox — bell, /inbox page, all notification triggers
e6f1021  fix: sitemap — use select('*'), remove join, wrap sections in try/catch
a33f0d4  feat: public armies directory, faction in army title, sitemap + landing page links
```

---

## What's built — full feature summary

### Phases 1–3 ✓ Complete
Full campaign management: auth, campaigns, interactive SVG map, territories, battles, factions, players, influence system (3 tiers), campaign events, chronicle, achievements, hall of honours.

### Phase 4 — Playtest & iterate (in progress)

Everything below is live on `main`:

- **XP & rank system** — `calcPlayerXP()` / `getXPRank()`, ranks Recruit→Legend, shown across player/faction/dashboard pages. XP is awarded for ALL battles (win=3, draw=2, loss=1) regardless of whether a territory is at stake — fixes league campaigns showing 0 XP. Event XP bonus only applies to territory battles.
- **Territory images** — upload/replace/remove, shown as hero on territory detail + hover thumbnail on map. Focal point control (Top/Ctr/Bot) to control crop; stored in `territories.image_focal_point`.
- **Email confirmation & password reset** flows fixed
- **Invite system** — `campaign_invite_codes` table, multi-link UI, per-link expiry + revoke
- **Organiser access** — checks both `organiser_id` and `campaign_members.role` consistently across all pages
- **Mobile responsiveness** — dashboard 3→2→1 col breakpoints, iOS input zoom fix (all inputs `fontSize: 1rem`)
- **Influence modes** — Standard / Victory Points / Manual, selectable per campaign
- **Event-linked influence (Tier 2)** — bonus conditions (territory / battle type / faction), AND across types, OR within; reversal via `battle_event_bonuses`
- **Territory Cascade (Tier 3)** — organiser sets trigger territory + bonus; win cascades to all warp-route-connected territories; reversal via `battle_cascade_bonuses`
- **Campaign Bulletin** — organiser-managed pinned dispatch on campaign dashboard; "+ New Dispatch" archives old, publishes fresh
- **Newsletter system** — platform announcements + campaign digest (Friday cron `0 8 * * 5`), opt-in modal, per-campaign digest toggles in profile. Subscriber opt-in data lives in `profiles` table (optin columns). Digest cron uses `last_digest_sent_at` (or `created_at` as baseline for new users) to determine eligibility — users are NOT eligible immediately on first signup.
- **Weekly Chronicle reports** — auto-generated every Friday `0 8 * * 5`: "Deployment Report" (new armies/units) and "Crusade Report" (XP/kills/upgrades), first-run catch-up, army name hyperlinks
- **Cross-campaign battle linking** — record the same real-world game in a second campaign; `source_battle_id` FK; "Multi-Campaign Record" badge on battle detail
- **Army Portfolio** — `armies`, `army_units`, `army_unit_photos` tables; army detail pages (public); edit page with unit manager, photo gallery, reorder arrows; army cards on dashboard and player profile
- **Army cover image focal point** — Top/Ctr/Bot toggle in Edit Army below cover image preview; stored in `armies.cover_focal_point`; respected on public army page with CSS `objectPosition`
- **Crusade Roster** — `crusade_unit_records` table; per-unit XP / kills / CP / upgrades / scars / size tracked per campaign; ReorderableRoster.js
- **Unit Portrait Pages** — public `/units/[id]` routes with dynamic OG metadata (800×419 og:image via `next/og`); photo hero, army link, faction, Crusade records per campaign. Layout order: Breadcrumb → Header → Share → Portrait Hero (square, lightbox) → Description/Record → Crusade Progress → Additional Photos gallery → Back link.
- **Unit portrait picker** — "Set as Portrait" button in photo gallery (Edit Army); gold border on active portrait; `army_unit_photos.is_portrait` flag; photos queried `ORDER BY is_portrait DESC, created_at ASC` everywhere. `UnitPortraitHero.js` shows hero with lightbox. `UnitPhotosViewer.js` shows additional photos gallery only.
- **Focal point on unit/battle photos** — Top/Ctr/Bot toggle per photo in gallery; stored in `army_unit_photos.focal_point` and `battle_photos.focal_point`; respected in all image displays via CSS `objectPosition`. API: `PATCH /api/photos/focal-point`.
- **1080×1080 share image** — `GET /api/units/[id]/share-image?download=1`; full-bleed photo, bottom caption, `battlesphere.cc` URL vignette; `ShareUnitButton.js` (download + copy link)
- **Battle Record pages** — public, no login needed; Copy Link button; 16:9 portrait hero image (first `is_portrait` photo, or first uploaded photo) displayed right below the share button with click-to-enlarge lightbox. `battle_photos.is_portrait` flag; "Set as Portrait" button in gallery for canEdit users.
- **Battle Record OG image** — `app/c/[slug]/battle/[id]/opengraph-image.js`; 800×419 WhatsApp/social preview card. **Photo layout (full-bleed)**: photo fills the entire 800×419 canvas; gradient overlay fades transparent→dark from left to right (solid at 68% width); text overlaid in a 265px zone on the right. Photo is clearly visible across ~65% of the image. Text-only fallback (no photo): dark void background with coloured radial gradients. Both layouts show faction matchup (VS with faction colour accents), result badge, territory, headline.
- **Landing page OG image** — `app/opengraph-image.js`; 800×419; dark void background with gold aurora, large "BATTLESPHERE" title, tagline split across three lines, domain stamp. Metadata in `app/layout.js` includes explicit `og:image` and `twitter:image` URLs for Discord/social scrapers.
- **Army Portfolio OG image** — `app/armies/[id]/opengraph-image.js`; 800×419; single `ImageResponse` with ternary: cover photo (419px left square panel) + text panel (381px right) when cover exists, placeholder diamond when not. Shows army name, faction, player, unit count. Title: `"[Name] — Army Portfolio"`. `generateMetadata` in `app/armies/[id]/page.js`.
- **Campaign OG image** — `app/campaign/[slug]/opengraph-image.js`; 800×419; narrative campaigns show the live map rendered as Satori-native JSX (position:absolute divs for territories/routes, no SVG); league/no-territory campaigns show a split text card: campaign name + setting on the left, league standings (rank · faction colour · name · W/D · pts) on the right, computed from actual battle data. Battles fetched as `select('attacker_faction_id, defender_faction_id, winner_faction_id')` (not head:true) so standings can be computed. Title: `"[Name] — BattleSphere Narrative Campaign"` or `"[Name] — BattleSphere League Campaign"`. `generateMetadata` in `app/campaign/[slug]/page.js`.
- **Influence State condition** — new Tier 2 event bonus condition type (`bonus_influence_states TEXT[]` on `campaign_events`). Three states: `neutral` (tied/no leader), `winner_dominant` (winner faction leads), `winner_not_dominant` (rival faction leads). Check reads pre-battle influence state — `applyEventBonuses` must run BEFORE `updateInfluence`/`applyBaseInfluence` in both `BattleLogForm.js` and `link-to-campaign/route.js`.
- **Unit name links** — roster rows link to `/units/[id]` with dotted underline
- **Super-admin section** (`/admin`): overview, users, battles, announcements, campaign detail, send-onboarding
- **Landing page** — compact horizontal masthead, three persona path cards, live demo links. Accessible to all users (logged in or not) — no redirect. Sign-in goes to `/dashboard`; clicking the BattleSphere wordmark in the nav goes to `/`.
- **Cloudinary photo galleries** — battle photos + faction photos + unit photos; unsigned upload preset `battlesphere_unsigned`; env var `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- **Cinzel font in Satori** — `public/fonts/Cinzel-400.woff`, `Cinzel-700.woff`, `Cinzel-900.woff` (woff format — woff2 NOT supported by Satori); loaded via `fs.readFileSync` in all OG/share image renderers
- **Vercel Analytics** enabled
- **New user onboarding journey** — automatic welcome email on registration, dashboard empty state CTAs, Austriacus framed as open narrative campaign

### League Campaign Format ✓ Complete

- **`campaign_format` column** on `campaigns` table (`TEXT NOT NULL DEFAULT 'narrative'`)
- **Campaign wizard** — step where organiser selects "Narrative" or "League" format
- **League campaigns hide**: Campaign Map section in admin, map tab in nav, map placeholder on public page, events strip, Territories stat, Active Events stat
- **League Table** — W/D/L/Pts standings shown on league campaign dashboard and public page
- **Demo campaign**: `home-game-league-anpa6`

#### Two campaign page files (important distinction):
- `app/c/[slug]/page.js` — authenticated dashboard (members only)
- `app/campaign/[slug]/page.js` — public-facing campaign page (no login required)

### Player Inbox / Notification System ✓ Complete (built 2026-05-06)

Full in-app notification system. DB migration run, all code deployed.

- **`user_notifications` table** — id, user_id, type, title, body, link, is_read, created_at, metadata JSONB. RLS: users SELECT/UPDATE own rows; admin client bypasses for inserts. Migration: `migration_user_notifications.sql`.
- **`campaign_events.notif_sent_at`** — new column, guards against duplicate event-live notifications.
- **`app/lib/notifications.js`** — server utility: `createNotification(userId, payload)`, `createNotificationForMany(userIds, payload)`, `NOTIF_TYPES`, `NOTIF_CONFIG` (icon, colour, label for 7 types). Shared between server and client.
- **`GET /api/notifications`** — returns `{ notifications[], unreadCount }` with limit/offset params.
- **`PATCH /api/notifications`** — marks read: `{ all: true }` or `{ ids: [] }`.
- **`POST /api/notifications/create`** — auth-gated, for client component triggers.
- **`NotificationBell.js`** — bell in NavBar, always visible on desktop + mobile (just before hamburger). Dropdown uses `position: fixed` + two refs: `bellRef` (button only, for measurement) and `dropRef` (container, for click-outside). Mobile-safe: `left = max(8, rect.right - dropWidth)`, `width = min(360, vw-16)`. Polls every 60s. Title is gold Link when `n.link` exists; separate "✓ Mark as read" button per unread item. Shows `metadata.tips` as gold pill buttons.
- **`app/inbox/page.js`** — full paginated inbox, All/Unread filter, load more, same tip-pill + link pattern.
- **Notification triggers** (all fire-and-forget, never block main action):
  - Battle logged → opponent(s): `battle_opponent` (username + battle title + factions + territory + result)
  - Achievement awarded → recipient: `achievement_awarded`
  - Registration → new user: `onboarding_welcome` with tip buttons
  - First army created → player: `onboarding_army` with tip buttons
  - First campaign created → organiser: `onboarding_campaign` with tip buttons
  - Weekly cron → all members: `weekly_report` (same run as digest email)
  - Daily cron `0 9 * * *` (`/api/cron/event-notifications`) → all members when event goes active: `event_live`; stamps `notif_sent_at` to prevent duplicates
- **Test data**: `BattleSphere Cowork Project/seed_test_notifications.sql` — plain INSERT (no PL/pgSQL); starts with DELETE so re-running replaces old data. Run in Supabase SQL Editor for user `b2e54bde-7868-4250-9228-a43ba5b9da92`.

### Admin overhaul — tools distributed to sub-pages (built 2026-05-07)

Organiser tools moved out of the monolithic Admin page and into the relevant sub-pages:

- **`/c/[slug]/admin`** — slimmed to two sections only: **General Settings** (name, description, visibility, influence mode, Discord webhook) and **Campaign Digest**. Join Requests link and Campaign Map link removed.
- **`/c/[slug]/players`** — three organiser tools at top:
  1. **Add Player** search (by username) — `AdminPlayerSearch.js` updated: "Current Members" duplicate list removed; expired invite links collapsed behind a `▸ Expired (N)` toggle.
  2. **Invite Links** (in same `AdminPlayerSearch` panel)
  3. **Join Requests** — `InlineJoinRequests.js` (new); shows only when pending > 0; approve fires `campaign_joined` notification; disappears when queue is empty.
  - **Player rows** now have an inline **Remove** button (`RemovePlayerButton.js`) as an extra column — both league and narrative tables. Hidden for the organiser's own row.
- **`/c/[slug]/factions`** — `AdminFactionManager.js` at bottom (built previous session): compact inline editor (colour + name per row, add/delete).
- **`/c/[slug]/battles`** — each battle row now has an inline **Delete** button (`DeleteBattleButton.js`). Runs full influence reversal (`reverseInfluence` + `reverseEventBonuses` + `reverseTerritoryCascade`) before deleting. Confirm flow: Delete → Sure? [Yes] [✕]. Standalone "Delete Battle Records" section removed.

**New components**:
- `app/components/RemovePlayerButton.js` — `'use client'`; props: `userId`, `campaignId`; confirm flow; `e.preventDefault()` + `e.stopPropagation()` on all buttons (lives inside `<Link>` wrappers); calls `router.refresh()` on success.
- `app/components/DeleteBattleButton.js` — same pattern; props: `battle`, `influenceMode`; runs reversal functions before delete.
- `app/components/InlineJoinRequests.js` — `'use client'`; props: `campaignId`, `campaignSlug`, `campaignName`, `initialRequests` (with `profiles:user_id(username)` join); renders `null` when empty.

### SEO pass (built 2026-05-06)
- **`app/sitemap.js`** — dynamic sitemap at `/sitemap.xml`; covers homepage, `/campaigns`, `/armies`, all `/campaign/[slug]` pages, all public `/armies/[id]` pages, all `/units/[id]` pages (from public armies), and all `/c/[slug]/battle/[id]` pages. Uses `select('*')` throughout; try/catch per section; battles-campaign mapping done via two separate queries (no join).
- **`app/robots.js`** — `/robots.txt`; allows all public routes; disallows `/admin/`, `/dashboard`, `/profile/`; points to sitemap URL.
- **`app/layout.js`** — title updated to `"BattleSphere — Warhammer 40k & Age of Sigmar Campaign Tracker"`; description keyword-rich; `title.template: '%s · BattleSphere'` so inner pages get the suffix automatically; `metadataBase` set; OG image dimensions corrected to 800×419.
- **`app/page.js`** — masthead pitch updated to `"Showcase your painted armies, run a club league, or launch your own map-based narrative campaign. For Warhammer 40,000, Age of Sigmar, and beyond. Free, forever."`; JSON-LD `SoftwareApplication` structured data block added; card 1 sub-label updated to "For the 40k Crusade & AoS collector"; card 1 and card 3 body copy name-drops 40k/AoS; "Browse all armies →" link under card 1 button; "Browse all campaigns →" link under card 3 button.
- **Meta descriptions improved** on `app/campaign/[slug]/page.js`, `app/armies/[id]/page.js`, `app/units/[id]/page.js`, `app/c/[slug]/battle/[id]/page.js` — fallback descriptions now include wargaming keywords and "on BattleSphere" branding.
- **Army page title** (`app/armies/[id]/page.js`) now includes faction name: `"[Army] — [Faction] Army Portfolio"`.
- **`app/campaigns/page.js`** — NEW public directory at `/campaigns`; lists only campaigns with at least one battle; sorted by battle count descending; shows Narrative/League badge, setting, battle count, description snippet; links to `/campaign/[slug]`.
- **`app/armies/page.js`** — NEW public directory at `/armies`; lists all public armies; sorted by unit count descending; shows faction badge, player name, unit count, description snippet; links to `/armies/[id]`.
- **Google Search Console** — domain `battlesphere.cc` verified via Cloudflare DNS TXT record; sitemap submitted at `https://www.battlesphere.cc/sitemap.xml`; key pages manually submitted via URL inspection tool.

### Platform Announcements — sent_at tracking (built 2026-05-04)
- `platform_announcements.sent_at` — new `TIMESTAMPTZ` column; stamped by the cron after each successful digest run (migration: `migration_announcements_sent_at.sql`)
- Cron (`app/api/cron/campaign-digest/route.js`) collects announcement IDs that were actually sent in a given run (`sentAnnouncementIds` Set), then stamps `sent_at` on them (guarded by `.is('sent_at', null)`)
- Admin announcements page (`/admin/announcements`) badge: green **✓ Sent [date]** if `sent_at` is set; gold **Pending — next digest [next Friday UTC]** if still null. `nextDigestFriday()` helper computes the upcoming Friday at 08:00 UTC.

### Discord OAuth login (built 2026-05-04)
- Login (`app/login/page.js`) and Register (`app/register/page.js`) both show a Discord button (background `#5865F2`, border `#4752c4`, SVG logo) above the email form, separated by an "or" divider.
- `handleDiscordLogin()` calls `supabase.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo: '/auth/callback' } })`
- **Auth callback** (`app/auth/callback/route.js`): after `exchangeCodeForSession`, detects new Discord users (`provider === 'discord'` + `created_at` within 3 minutes). Sets profile username from `user.user_metadata?.name || full_name` if null, sets default newsletter prefs if `optin_platform_news IS NULL`, fires welcome email non-blocking.
- **`handle_new_user()` trigger** (DB): updated to `COALESCE(raw_user_meta_data->>'username', raw_user_meta_data->>'name', split_part(email,'@',1))` — handles Discord (which uses `name`, not `username`) and email signups alike. Migration: `migration_discord_oauth.sql`.
- Existing email/password accounts are NOT overwritten — Discord OAuth creates a separate auth method that Supabase links by email if the address matches.

### Discord webhook integration (built 2026-05-04)
- **`app/lib/discord.js`** — shared utility file:
  - `postToDiscord(webhookUrl, payload)` — fire-and-forget fetch, errors swallowed
  - `buildBattleEmbed()` — green (win) / grey (draw); attacker, defender, territory, score fields; links to `/c/[slug]/battle/[id]`
  - `buildBulletinEmbed()` — gold; strips `[[Target|Label]]` wiki syntax → keeps Label only; strips `##` headings; links to `/c/[slug]`
  - `buildEventEmbed()` — blue; links to `/c/[slug]/events/[id]`
  - `buildTestEmbed()` — gold confirmation message
  - Colors: `GOLD=12028992`, `GREEN=5025653`, `GREY=5921370`, `BLUE=6316128`
- **`app/api/discord/notify/route.js`** — auth-gated POST route; fetches `discord_webhook_url` server-side via `createAdminClient()` (never exposed to browser); routes to embed builders by `type` (`battle`, `bulletin`, `event`, `test`)
- **`AdminCampaignSettings.js`** — new "Discord Integration" section: webhook URL input, Save button, "Send test message" button with live feedback
- **Triggers wired up**:
  - `BattleLogForm.js` — fires after battle insert
  - `BulletinDrawer.js` — fires after new dispatch published (both first-ever and subsequent)
  - `EventForm.js` — fires after new event created (guarded by `!isEditing`)
- **`campaigns.discord_webhook_url TEXT`** — new column; migration: `migration_discord_webhook.sql`

### Campaign Events — date-based expiry + detail page fix (built 2026-04-28 / 2026-05-04)
- `applyEventBonuses()` and `applyTerritoryCascade()` in `influence.js` now filter by date as well as status: events where `starts_at > now` (not yet started) or `ends_at < now` (already ended) are excluded even if their status is still 'active'
- New event form defaults `starts_at` to the current local date/time; edit form leaves it as stored
- Events list (`app/c/[slug]/events/page.js`) computes `_effectiveStatus` client-side: events past their `ends_at` display and sort as 'resolved' without requiring a manual status update
- **Campaign dashboard** (`app/c/[slug]/page.js`) `activeEventCount` and `activeEvents` queries now filter server-side by `ends_at > now` (or null) AND `starts_at <= now` (or null) — previously showed ended events as still active in the "Active Events" box
- **Event detail page** (`app/c/[slug]/events/[id]/page.js`) now also uses `effectiveStatus()` — previously showed raw DB `status` so expired events appeared "active"
- **EventForm date guard** (`app/components/EventForm.js`) — in edit mode, `starts_at` / `ends_at` fields are locked by default with a "Set date" / "Clear" toggle; prevents browser auto-fill from overwriting `null` dates with today's date on first click. Guards: `startsAtEnabled` / `endsAtEnabled` state, payload respects them.

### Admin — Army Portfolios section (built 2026-05-04)
- **`/admin/armies`** — new dedicated admin page (parallel to Overview / Users / Battles); table shows: army name + faction, owner username, total unit count, units added in past 30 days (gold "+N"), last updated date, View link; sorted by `updated_at DESC`
- Admin nav (`app/admin/layout.js`) has "Armies" link between Battles and Send Onboarding
- Admin overview (`app/admin/page.js`) shows "Army Portfolios" stat card (count only via `count: exact`); stat bar is now 4 columns
- Owner lookup uses `armies.player_id` FK (NOT `user_id`)

### Unit thumbnail photos enlarged (built 2026-05-04)
- `ReorderableRoster.js` — photo moved from inline 44×44px header thumbnail to full-height 100px left column; units without photos get a matching 100px empty column with `border-right` so the layout stays uniform across all roster rows

### OG images scaled to 800×419 for WhatsApp (built 2026-05-04)
- All five `opengraph-image.js` files rewritten at 800×419 (down from 1200×630) — 44% fewer pixels, brings PNG under WhatsApp's 600 KB limit
- Scale factor ≈ 0.667 applied to all pixel values (fonts, padding, photo panels, map node sizes)
- Cloudinary crop URLs updated to fetch smaller source images matching new photo panel dimensions
- `buildMapElements()` in campaign OG now called with `W=800, H=419`; map node diamond `sz` reduced 20→13, sub-node radius 6→4
- All four `generateMetadata` functions updated: `width: 800, height: 419` (was 1200, 630)
- Affected files: `app/opengraph-image.js`, `app/units/[id]/opengraph-image.js`, `app/armies/[id]/opengraph-image.js`, `app/c/[slug]/battle/[id]/opengraph-image.js`, `app/campaign/[slug]/opengraph-image.js`

### Platform Announcements — reordering + Markdown renderer (built 2026-04-28)
- `platform_announcements` table has a new `sort_order INTEGER NOT NULL DEFAULT 0` column (migration run ✓)
- Admin announcements page (`/admin/announcements`) shows ↑/↓ reorder buttons when 2+ items are queued; order is persisted to DB immediately
- New items are appended to end (`sort_order = messages.length`); query uses `sort_order ASC, created_at ASC`
- Digest renderer (`app/api/cron/campaign-digest/route.js`) now processes announcement bodies: `**bold**` → `<strong>`, blank lines → paragraph breaks, existing `<a href>` tags pass through unchanged. Title renders as its own bold heading above the body.
- Formatting guide shown in the editor UI: `**bold**`, blank lines for paragraphs, `<a href="...">` for links

---

## Pending backlog (in priority order)

1. **PostHog product analytics** — custom events at key journey moments (portrait view, share-image download, copy link, battle logged, campaign created, etc.)
2. **Reddit promotion** — craft and post to r/warhammer40k, r/ageofsigmar, r/wargaming etc. to drive backlinks and first users

---

## Supabase explicit grants (done 2026-05-13)

Supabase is removing auto-grants on public schema tables (May 30 for new projects, October 30 for all). Migration `migration_explicit_grants.sql` was run — all existing tables now have explicit GRANTs for `anon`, `authenticated`, and `service_role`.

**Rule going forward**: every new `CREATE TABLE` migration must include explicit grants. Template at the bottom of `migration_explicit_grants.sql`. Pattern:
```sql
-- Public table (anon can read):
GRANT SELECT                         ON public.your_table TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.your_table TO authenticated;
GRANT ALL                            ON public.your_table TO service_role;

-- Private table (no anon):
GRANT SELECT, INSERT, UPDATE, DELETE ON public.your_table TO authenticated;
GRANT ALL                            ON public.your_table TO service_role;
```

---

## Key technical rules (must follow every session)

- **`@` alias** maps to the project root: `@/app/components/...`
- **All files `.js`** — never `.tsx` or TypeScript syntax
- **`select('*')`** — always use for Supabase queries; specific column lists silently fail if a column is missing
- **Avoid `.maybeSingle()`** — use `.limit(1)` and `?.[0] ?? null` instead
- **Event handlers** must be in `'use client'` components — never in server components
- **`export const metadata`** only works in server components — never in a `'use client'` file
- **All `<input>` / `<textarea>`** must use `fontSize: '1rem'` (≥16px) — prevents iOS Safari auto-zoom
- **Campaign roles**: `'player'` | `'organiser'` | `'admin'` (lowercase); legacy `'Organiser'` (capital O) also exists in some DB rows
- **Middleware**: `proxy.js`, exports `proxy` (not `middleware`) — Next.js 16 naming
- **Git push works directly** — token is embedded in the remote URL
- If `git commit` fails with `HEAD.lock`: request Cowork file delete permission, then `rm -f .git/HEAD.lock`
- **Server components**: `createClient` from `@/lib/supabase/server`. **Client components**: `createClient` from `@/lib/supabase/client`
- **Admin client**: `createAdminClient()` from `@/lib/supabase/admin` — service role, server-side only; required for any operation bypassing RLS
- **`profiles` has no email column** — use `supabase.auth.admin.getUserById(id)` or `auth.admin.listUsers()` server-side
- **Supabase newly-added columns return `undefined` (not `null`)** — always use `== null` (loose equality) when checking for missing values
- **Supabase RLS silent failure**: UPDATE/INSERT blocked by RLS returns `{ data: [], error: null }` — add `.select()` and check `savedRows.length === 0`
- **RLS recursion**: never query `campaign_members` inside a policy on `campaign_members` — use `public.is_campaign_member()` or `public.is_campaign_organiser_or_admin()` SECURITY DEFINER functions
- **`sort_order`** exists on `army_units` and `platform_announcements` — does NOT exist on `territories` (order by `depth` then `name`)
- **Cloudinary upload preset**: `battlesphere_unsigned` (unsigned); env var: `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- **Territory images** stored in Supabase storage bucket `territory-images` (not Cloudinary) — no Cloudinary transforms apply; pass URL as-is
- **OG image canvas size**: all `opengraph-image.js` files use `size = { width: 800, height: 419 }` — this keeps PNG file size under WhatsApp's 600 KB limit (down from 1200×630 which produced ~1.1 MB). Do NOT increase the canvas size.
- **OG/share image renderers** (`opengraph-image.js`, `share-image/route.js`) use hardcoded brand palette (Satori doesn't read CSS vars): `BG_VOID #0a0a0f`, `GOLD #b78c40`, `GOLD_BRT #d4a853`, `TEXT_PRI #e8e0d0`, `TEXT_SEC #a09880`
- **Satori font**: woff format only — woff2 NOT supported. Fonts at `public/fonts/Cinzel-{400,700,900}.woff`, loaded via `fs.readFileSync(path.join(process.cwd(), 'public/fonts/...'))`
- **Satori numeric JSX children crash**: Satori (Next.js 16) crashes if a raw JavaScript number is passed as a JSX child — e.g. `{count} Units` causes FUNCTION_INVOCATION_FAILED. Always pre-build the string: `` {`${count} Units`} `` or `{String(count) + ' Units'}`. Template literals and pre-computed strings are always safe.
- **Satori unsupported CSS** — these properties cause silent crashes in Next.js 16's Satori: `flexWrap`, `minWidth`, `minHeight`, `maxWidth`, `maxHeight`, `textAlign: 'right'` (use a fixed-width wrapper + `justifyContent: 'flex-end'` instead), `borderBottom/Top/Left/Right: 'none'` (use `'0px solid transparent'` instead), `gap: 0` (omit entirely). Safe alternatives: use explicit pixel widths, `flexShrink: 0`, and `marginRight/Left` for spacing.
- **Satori `&&` vs ternary**: Use explicit ternaries (`condition ? <el/> : null`) in OG image JSX rather than `&&` short-circuit rendering — safer across Satori versions.
- **OG image single render path**: Prefer a single `return new ImageResponse(...)` with ternaries inside the JSX (like the working `units/[id]/opengraph-image.js`) over multiple `return new ImageResponse(...)` branches — more predictable with Satori.
- **`{ ...size, ...fontOptions }`**: Always spread fontOptions as `{ ...size, ...fontOptions }` where `fontOptions = { fonts: [...] }` — matches all working OG renderers. Never use `{ ...size, fonts }` shorthand.
- **Battles table**: no `result` column — win/draw determined entirely by `winner_faction_id` (`NULL` = draw, otherwise = winning faction's ID)
- **`handle_new_user()` trigger**: fires on `auth.users` INSERT; uses `COALESCE(raw_user_meta_data->>'username', raw_user_meta_data->>'name', split_part(email,'@',1))` — handles both email signups (`username`) and Discord OAuth (`name`). Seed scripts must pass `{"username":"..."}` in `raw_user_meta_data`.
- **Discord OAuth metadata**: Discord puts the display name in `raw_user_meta_data->>'name'` (NOT `username`). The auth callback (`app/auth/callback/route.js`) has a safety net: if a new Discord user's profile username is still null, it sets it from `user.user_metadata?.name || full_name`.
- **`/c/[slug]` and `/c/[slug]/events/[id]` access control**: both unauthenticated users AND logged-in users who are not members/organisers are redirected to `/campaign/[slug]` (the public page). Previously only unauthenticated users were redirected to `/login`.
- **Public page `allBattles` query** must include `territory_id` and `event_xp_bonus` — without these, `calcPlayerXP()` returns 0 for everyone
- **`PhotoGallery.js` portrait picker** — `showPortrait` is enabled for both `entityType === 'army-unit'` AND `entityType === 'battle'`. Internal `activePortraitId` state is initialised from the `portraitPhotoId` prop and updated on Set as Portrait. `handleSetPortrait` calls `/api/photos/army-unit` (PATCH) for army-unit, `/api/photos/battle` (PATCH) for battle.
- **Campaign Events date filtering** — `applyEventBonuses` and `applyTerritoryCascade` in `influence.js` filter by `starts_at` and `ends_at` as well as `status`. Events that haven't started yet or have passed their end date do not apply bonuses even if status is still 'active'.
- **Notifications are always fire-and-forget** — every call to `createNotification()` must be followed by `.catch(() => {})` and must never be `await`-ed in a way that blocks the main user action. Import from `@/app/lib/notifications`.
- **`NotificationBell.js` uses two refs** — `bellRef` on the button (for `getBoundingClientRect()` positioning) and `dropRef` on the outer container (for click-outside detection). Never merge these into one ref — measuring the container after the dropdown renders gives an inflated rect and breaks mobile positioning.

---

## Key URLs

| Route | Description |
|---|---|
| `/c/[slug]` | Campaign dashboard (authenticated) |
| `/campaign/[slug]` | Public campaign page (no login) |
| `/c/[slug]/battle/[id]` | Battle detail (public) |
| `/c/[slug]/territory/[id]` | Territory detail |
| `/c/[slug]/player/[userId]` | Player profile (campaign-scoped) |
| `/c/[slug]/faction/[id]` | Faction detail |
| `/armies/[id]` | Army portfolio (public) |
| `/units/[id]` | Unit portrait page (public) |
| `/admin` | Super-admin overview |
| `/admin/users` | All users list |
| `/admin/battles` | All battles list |
| `/admin/campaigns/[id]` | Campaign admin detail |
| `/admin/announcements` | Platform Announcements queue |
| `/admin/armies` | Army Portfolios overview (all armies, owner, unit counts, last updated) |
| `/campaigns` | Public campaigns directory (all campaigns with battles, sorted by battle count) |
| `/armies` | Public armies directory (all public armies, sorted by unit count) |

---

## DB tables (all with RLS)

`profiles`, `campaigns`, `campaign_members`, `factions`, `territories`, `battles`, `territory_influence`, `campaign_events`, `achievements`, `join_requests`, `campaign_invite_codes`, `warp_routes`, `armies`, `army_units`, `army_unit_photos`, `campaign_army_records`, `crusade_unit_records`, `battle_photos`, `battle_event_bonuses`, `battle_cascade_bonuses`, `chronicle_weekly_updates`, `platform_announcements`, `campaign_digest_messages`, `bulletin_dispatches`, `user_notifications`

### Recent schema additions
- `army_unit_photos.is_portrait` — BOOLEAN NOT NULL DEFAULT false; portrait picker for unit gallery
- `army_unit_photos.focal_point` — VARCHAR NOT NULL DEFAULT 'center'; Top/Ctr/Bot crop control
- `battle_photos.focal_point` — VARCHAR NOT NULL DEFAULT 'center'; Top/Ctr/Bot crop control
- `battle_photos.is_portrait` — BOOLEAN NOT NULL DEFAULT false; portrait hero for battle detail page
- `territories.image_focal_point` — VARCHAR NOT NULL DEFAULT 'center'; Top/Ctr/Bot crop control
- `armies.cover_focal_point` — VARCHAR NOT NULL DEFAULT 'center'; Top/Ctr/Bot crop on army cover
- `platform_announcements.sort_order` — INTEGER NOT NULL DEFAULT 0; display order in digest email; migration run 2026-04-28
- `platform_announcements.sent_at` — TIMESTAMPTZ; stamped by cron after successful send; NULL = still pending; migration: `migration_announcements_sent_at.sql`
- `campaigns.discord_webhook_url` — TEXT; Discord webhook URL per campaign; fetched server-side only via admin client; migration: `migration_discord_webhook.sql`
- `user_notifications` — full table (see notification system above); migration: `migration_user_notifications.sql`
- `campaign_events.notif_sent_at` — TIMESTAMPTZ DEFAULT NULL; stamped after event-live notification sent to prevent duplicates; added in same migration
