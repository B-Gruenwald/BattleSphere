# BattleSphere — Session Handoff Prompt

## Who I am
I'm Benjamin Grünwald, a Warhammer 40,000 hobbyist with limited coding skills. I'm building **BattleSphere** — a system-agnostic narrative wargaming campaign platform — using Claude to write all the code. I make product decisions and test; Claude implements. Keep explanations non-technical where possible.

---

## Platform & access

### Live site
- **URL**: https://www.battlesphere.cc (primary) — also accessible at https://battle-sphere-topaz.vercel.app
- **Hosting**: Vercel (auto-deploys from GitHub on push to `main`)
- **GitHub repo**: https://github.com/B-Gruenwald/BattleSphere
- **Domain**: battlesphere.cc — migration complete as of 2026-04-10. `battlesphere.cc` redirects to `www.battlesphere.cc`.

### Local code
- **Folder**: `/Users/benjamingrunwald/Desktop/BattleSphere` — request access at the start of every session with `request_cowork_directory: ~/Desktop/BattleSphere`
- **Cowork project folder** (for deliverables like SQL migrations): `/Users/benjamingrunwald/Documents/Claude/BattleSphere Cowork Project`

### Backend
- **Supabase**: database, auth, and storage. SQL migrations must be run manually in the Supabase SQL Editor.
- **Stack**: Next.js 16.2, React 19, Tailwind CSS v4, @supabase/supabase-js, @supabase/ssr, resend
- **All files use `.js`** — never `.tsx` or TypeScript.

### Email (Resend)
- Domain `battlesphere.cc` verified in Resend (region: Ireland eu-west-1)
- All emails (auth confirmations, password resets, join requests, feedback) send from `noreply@battlesphere.cc`
- `RESEND_FROM_EMAIL` = `BattleSphere <noreply@battlesphere.cc>` (set in Vercel env vars)
- `NEXT_PUBLIC_APP_URL` = `https://www.battlesphere.cc` (set in Vercel env vars)
- Supabase auth emails routed via Resend SMTP (`smtp.resend.com`, port 465, user: `resend`, password: Resend API key)

---

## Project state

### Last commit
`f89b17f` — `fix: white text on Join faction button for visibility`

### Phase 1–3: Complete
Full campaign management system — auth, campaigns, map, territories, battles, factions, players, influence, events, chronicle, achievements. See memory file for full detail.

### Phase 4: Playtest & iterate (in progress)

**Completed previous sessions:**

1. **XP system** — `app/lib/xp.js` with `calcPlayerXP()` and `getXPRank()`. Ranks: Recruit → Warrior → Veteran → Champion → Hero → Legend. XP shown on player detail, players list, faction detail, and campaign dashboard (new "Player Standings" panel).

2. **Territory images**:
   - `territories.image_url TEXT` column added (migration run)
   - Supabase Storage bucket `territory-images` created (public, policies set)
   - `TerritoryImageUpload.js` — upload/replace/remove, 5 MB limit, jpg/png/webp
   - `TerritoryImageSection.js` — client wrapper for territory detail page
   - Territory detail page: image hero visible to all; upload panel for organisers only
   - `MapEditForm.js`: image upload row in map editor per territory
   - `CampaignMap.js`: hover tooltip shows image thumbnail (SVG `<image>` + gradient fade)

3. **Email confirmation fixed**:
   - `app/auth/callback/route.js` created — exchanges Supabase one-time code for a session, redirects to `/dashboard`
   - `register/page.js` now passes `emailRedirectTo: /auth/callback` using `window.location.origin` dynamically

4. **Invite system overhauled**:
   - New `campaign_invite_codes` table (migration run) — per-row codes with 7-day expiry
   - `AdminPlayerSearch.js` rewritten: multiple simultaneous invite links, per-link expiry + individual Revoke button
   - `join/[code]/page.js` updated: looks up `campaign_invite_codes`, checks expiry, distinct error messages for expired vs invalid

5. **Organiser access bug fixed** across 8 pages — `isOrganiser` now checks both `campaign.organiser_id` and `campaign_members.role IN ('admin', 'organiser')` via a `myMembership` query.

6. **Vespator Front map seeded** — `seed_vespator_front.sql` creates 13 worlds, 32 sub-territories, and 18 warp routes.

7. **Territory image replacement bug fixed** (`TerritoryImageUpload.js`) — uploaded image URLs now include a `?t={timestamp}` cache-buster.

8. **Domain migration complete** (2026-04-10):
   - `battlesphere.cc` and `www.battlesphere.cc` connected to Vercel; Cloudflare DNS records set (grey cloud / DNS only)
   - Resend domain verified; all emails now send from `noreply@battlesphere.cc`
   - Supabase Site URL and redirect URLs updated to `https://www.battlesphere.cc`
   - Supabase auth emails now routed via Resend SMTP
   - `NEXT_PUBLIC_APP_URL` and `RESEND_FROM_EMAIL` env vars set in Vercel
   - Hardcoded fallback URLs updated in `AdminPlayerSearch.js` and `app/api/join-request/route.js`

9. **Onboarding email system** (2026-04-10):
   - `app/api/send-onboarding/route.js` — sends branded HTML welcome email via Resend; protected to `is_admin` users only
   - `app/admin/send-onboarding/page.js` — admin UI: enter recipient email + optional first name, generate a personal invite link (same logic as `AdminPlayerSearch`), send in one click
   - Invite link for **Austriacus Subsector** is generated in-page — no copy-pasting between pages
   - Email includes: personal message from Benjamin, BattleSphere intro, Register CTA, Join Austriacus Subsector CTA (linked to `https://www.battlesphere.cc/campaign/austriacus-subsector-93n4g`), first-steps guide, feedback form pointer
   - Optional first name field: if filled, email opens with "Dear [Name],"
   - "Send Onboarding Email" link added to super-admin sub-nav

10. **campaign_members RLS infinite recursion fixed** (2026-04-10):
    - Root cause: `organisers_insert_members` INSERT policy queried `campaign_members` directly in its `WITH CHECK`, triggering SELECT policies recursively
    - Fix: `migration_fix_members_rls_recursion.sql` (run in Supabase SQL Editor) —
      creates `public.is_campaign_organiser_or_admin(uuid)` SECURITY DEFINER function,
      drops the redundant recursive SELECT policy, rebuilds INSERT and DELETE policies
    - **This was blocking all invite-link joins and new campaign creation for non-organiser users**

11. **Delete Campaign (super-admin)** (2026-04-10):
    - `app/api/admin/delete-campaign/route.js` — DELETE endpoint, admin-client, cascades all related rows
    - `app/admin/campaigns/[id]/DeleteCampaignButton.js` — two-step confirm button in campaign detail header
    - Added to `app/admin/campaigns/[id]/page.js`

12. **"Choose Your Faction" button on campaign dashboard** (2026-04-10):
    - `app/components/ChooseFactionButton.js` — gold prompt button in campaign header; expands inline to a dropdown; commit button only appears after a faction is selected, labelled "Join [Faction Name] →"; reloads page on success
    - Only shown when user is a member with no faction assigned
    - `app/c/[slug]/page.js` updated: `myMembership` now selects `role, faction_id`; `ChooseFactionButton` rendered in header

---

## Planned next tasks (tackle in order)

1. **Mobile responsiveness pass** — nav bar (hamburger/tab strip), data tables (horizontal scroll or card layout), forms, and the SVG campaign map (tap-to-select, pinch-zoom or scrollable container).
2. **Influence mechanics Tier 1** — selectable influence modes per campaign (current system, 1-per-win, etc.), configured in the Create Campaign wizard.
3. **Influence mechanics Tier 2** — event-linked mission bonuses (e.g. extra influence for Boarding Action battles during active events); requires adding a mission type field to the battle log form.
4. **Influence mechanics Tier 3** — cascade influence via warp routes (victory in a connected territory ripples influence to adjacent systems).

---

## Key technical rules (must follow every session)

- **`@` alias** maps to the project root: use `@/app/components/...`
- **Event handlers** must be in `'use client'` components — extract to a client component if needed.
- **`export const metadata`** only works in server components — never add `'use client'` to a page that exports metadata.
- **Supabase RLS silent failure**: UPDATE/INSERT blocked by RLS returns `{ data: [], error: null }`. Always add `.select()` and check `savedRows.length === 0`.
- **Always use `select('*')`** — specific column lists silently fail if a column is missing.
- **Step components in Create Campaign wizard** must be called as `Step1()` not `<Step1 />`.
- **Middleware** is `proxy.js`, exports `proxy` (not `middleware`) — Next.js 16 naming.
- **Git push works directly** — token is embedded in the remote URL.
- If `git commit` fails with `HEAD.lock`: request Cowork file delete permission, then `rm -f .git/HEAD.lock`.
- **Server components** use `createClient` from `@/lib/supabase/server`. **Client components** use `createClient` from `@/lib/supabase/client`.
- **Admin client**: `lib/supabase/admin.js` exports `createAdminClient()` using `SUPABASE_SERVICE_ROLE_KEY` — server-side API routes only, never browser.
- **Storage bucket** `territory-images` is public. Upload path: `{campaign_id}/{territory_id}/image.{ext}`. Use `upsert: true`.
- **RLS policies on `campaign_members`**: never query `campaign_members` directly inside a policy on `campaign_members` — use the `public.is_campaign_organiser_or_admin(uuid)` SECURITY DEFINER function instead to avoid infinite recursion.

---

## Supabase DB tables (all with RLS)

`profiles`, `campaigns`, `campaign_members`, `factions`, `territories`, `battles`, `territory_influence`, `campaign_events`, `achievements`, `join_requests`, `campaign_invite_codes`, `warp_routes`

Key columns:
- `territories.controlling_faction_id`, `territories.image_url`
- `campaign_members.faction_id`
- `battles.attacker_player_id`, `battles.defender_player_id`, `battles.logged_by`
- `join_requests.status` — `'pending'` | `'approved'` | `'rejected'`
- `campaign_invite_codes.code`, `campaign_invite_codes.expires_at`
- `campaign_members.role` — `'player'` | `'organiser'` | `'admin'` (lowercase; legacy `'Organiser'` capital also exists in some rows)
- `profiles.is_admin` — boolean, gates access to `/admin` super-admin area
