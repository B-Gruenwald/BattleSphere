# BattleSphere — Session Handoff Prompt

## Who I am
I'm Benjamin Grünwald, a Warhammer 40,000 hobbyist with limited coding skills. I'm building **BattleSphere** — a system-agnostic narrative wargaming campaign platform — using Claude to write all the code. I make product decisions and test; Claude implements. Keep explanations non-technical where possible.

---

## Platform & access

### Live site
- **URL**: https://battle-sphere-topaz.vercel.app
- **Hosting**: Vercel (auto-deploys from GitHub on push to `main`)
- **GitHub repo**: https://github.com/B-Gruenwald/BattleSphere

### Local code
- **Folder**: `/Users/benjamingrunwald/Desktop/BattleSphere` — request access at the start of every session with `request_cowork_directory: ~/Desktop/BattleSphere`
- **Cowork project folder** (for deliverables like SQL migrations): `/Users/benjamingrunwald/Documents/Claude/BattleSphere Cowork Project`

### Backend
- **Supabase**: database, auth, and storage. SQL migrations must be run manually in the Supabase SQL Editor.
- **Stack**: Next.js 16.2, React 19, Tailwind CSS v4, @supabase/supabase-js, @supabase/ssr, resend
- **All files use `.js`** — never `.tsx` or TypeScript.

---

## Project state

### Last commit
`9ffb7ce` — `fix(onboarding): fix email confirmation, invite links, and public page access`

### Phase 1–3: Complete
Full campaign management system — auth, campaigns, map, territories, battles, factions, players, influence, events, chronicle, achievements. See memory file for full detail.

### Phase 4: Playtest & iterate (in progress)

**Completed this session (2026-04-08):**

1. **XP system** — `app/lib/xp.js` with `calcPlayerXP()` and `getXPRank()`. Ranks: Recruit → Warrior → Veteran → Champion → Hero → Legend. XP shown on player detail, players list, faction detail, and campaign dashboard (new "Player Standings" panel).

2. **Influence rebalance** — Win +3 / Draw +2 (both factions) / Loss +1. `BattleLogForm.js` `updateInfluence` rewritten. `influence.js` `reverseInfluence` updated to match.

3. **Territory images**:
   - `territories.image_url TEXT` column added (migration run)
   - Supabase Storage bucket `territory-images` created (public, policies set)
   - `TerritoryImageUpload.js` — upload/replace/remove, 5 MB limit, jpg/png/webp
   - `TerritoryImageSection.js` — client wrapper for territory detail page
   - Territory detail page: image hero visible to all; upload panel for organisers only
   - `MapEditForm.js`: image upload row in map editor per territory
   - `CampaignMap.js`: hover tooltip shows image thumbnail (SVG `<image>` + gradient fade)

4. **Email confirmation fixed**:
   - `app/auth/callback/route.js` created — exchanges Supabase one-time code for a session, redirects to `/dashboard`
   - `register/page.js` now passes `emailRedirectTo: /auth/callback`
   - Supabase Site URL and redirect URL configured in Supabase dashboard
   - Cosmetic TODO for Benjamin: update email template subject/body to say "BattleSphere"

5. **Invite system overhauled**:
   - New `campaign_invite_codes` table (migration run) — per-row codes with 7-day expiry
   - `AdminPlayerSearch.js` rewritten: multiple simultaneous invite links, per-link expiry + individual Revoke button, expired codes shown separately
   - `join/[code]/page.js` updated: looks up `campaign_invite_codes`, checks expiry, distinct error messages for expired vs invalid
   - `admin/page.js` fetches and passes `initialInviteCodes`

6. **RLS fixed for authenticated non-members**:
   - Two migrations run: `migration_invite_codes.sql` and `migration_public_page_rls.sql`
   - Tables now readable by authenticated users (not just anon): `campaigns`, `factions`, `territories`, `battles`, `territory_influence`, `campaign_events`, `achievements`, `campaign_members`, `profiles`
   - Fixed: logged-in non-members can now view the public campaign page with full data, and join via invite link

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

---

## Supabase DB tables (all with RLS)

`profiles`, `campaigns`, `campaign_members`, `factions`, `territories`, `battles`, `territory_influence`, `campaign_events`, `achievements`, `join_requests`, `campaign_invite_codes`, `warp_routes`

Key columns:
- `territories.controlling_faction_id`, `territories.image_url`
- `campaign_members.faction_id`
- `battles.attacker_player_id`, `battles.defender_player_id`, `battles.logged_by`
- `join_requests.status` — `'pending'` | `'approved'` | `'rejected'`
- `campaign_invite_codes.code`, `campaign_invite_codes.expires_at`

---

## Likely next tasks

- Mobile responsiveness pass across all pages
- Any further user testing feedback from live players
- Secure a domain for BattleSphere → needed to unlock full Resend email delivery to all organisers (currently only delivers to Benjamin's Resend account email)
- Phase 5: Launch & grow / monetisation
