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
- **Folder**: `/Users/benjamingrunwald/Desktop/BattleSphere` — this is mounted in Cowork
- **Cowork project folder** (for deliverables like SQL migrations): `/Users/benjamingrunwald/Documents/Claude/BattleSphere Cowork Project`

### Backend
- **Supabase** project: the database, auth, and storage. SQL migrations must be run manually in the Supabase SQL Editor (I paste and run them).
- **Stack**: Next.js 16.2, React 19, Tailwind CSS v4, @supabase/supabase-js, @supabase/ssr
- **All files use `.js`** — never `.tsx` or TypeScript.

---

## Project state

### What's built (Phases 1–3 complete)

**Phase 1** — Design system, landing page, auth (register / login / forgot password), protected dashboard listing campaigns.

**Phase 2** — Full campaign system:
- Create Campaign wizard (4-step, generates factions + territories)
- Campaign Dashboard: live stats, faction standings, recent battles
- Interactive SVG map (node/network, not geographic tiles)
- Territory Detail: controlling faction, sub-territories, battle history
- Battle Log form: player/faction/territory/result/chronicle, control transfer
- Battle Detail page
- Faction Standings & Faction Detail pages
- Player List & Player Profile pages (set-own-faction form, battle history)

**Phase 3** — Narrative layers:
- **Influence system**: territory_influence table, points per battle, organiser override form
- **Campaign Events**: post/edit/delete events (organiser), events list, event detail, active events panel on dashboard
- **Campaign Chronicle**: unified timeline of battles + events grouped by day
- **Achievements / Hall of Honours**: 8 presets + emoji palette, award form (organiser), achievements strip on player/faction pages, revoke button

**Phase 4** — Playtest & iterate (in progress, user testing started 2026-04-01):

Bug fixes completed:
- Battle form: removed "transfer control" checkbox, improved faction-missing validation, fixed silent RLS failure in BattleEditForm with `.select()` guard
- Battle co-ownership: attackers, defenders, logger, or organiser can all edit a battle record
- Personal Battle Log on dashboard: shows all battles the logged-in user participated in
- Map territory visibility: 6-pass normalisation pipeline ensures nodes never overlap; sub-territory label placement improved
- Territory editing (MapEditForm): new territories now saved with computed x_pos/y_pos

Public campaign page (built this session):
- `/campaign/[slug]` — unauthenticated/public view with read-only map (full browser width), faction standings, recent chronicle, and "Request to Join" CTA
- Join request flow: `join_requests` table, JoinRequestButton client component, organiser approval/decline UI at `/c/[slug]/requests`
- Admin page now shows pending join request count and link to requests list
- "Share Public Page ↗" button added to campaign dashboard for all members

Other fixes this session:
- Privacy policy build error fixed (removed event handlers from server component, replaced with CSS hover class)
- Username rename: `TheNamd` → `TheNamad` via SQL
- Faction save bug fixed in `SetFactionForm.js` (`.select()` added; silent RLS failure now surfaces as user-visible error)

---

## Pending SQL migrations (must be run in Supabase SQL Editor)

These files are in the Cowork Project folder. Check which have already been run before re-applying.

1. **`migration_public_access.sql`** — anon SELECT policies on 8 tables + `join_requests` table DDL + 4 RLS policies. Required for the public campaign page and join request flow to work.
2. **`migration_battle_co_ownership.sql`** — RLS UPDATE policy allowing attacker/defender/logger/organiser to edit battle records.
3. **`migration_faction_update_policy.sql`** — RLS UPDATE policy allowing members to update their own `faction_id` on `campaign_members`. Required to fix BENDER GMX's faction save bug.

---

## Key technical rules (must follow every session)

- **Always replace full files** — never partial edits; write the complete file content.
- **`@` alias** maps to the project root: use `@/app/components/...` not `@/components/...`.
- **Event handlers must be in `'use client'` components** — `onMouseEnter`, `onClick`, etc. cannot exist in server components. Extract to a separate client component file if needed.
- **`export const metadata`** only works in server components — never add `'use client'` to a page that exports metadata.
- **Supabase RLS silent failure pattern**: UPDATE/INSERT blocked by RLS returns `{ data: [], error: null }`. Always add `.select()` and check `savedRows.length === 0` to detect it.
- **Always use `select('*')`** — specific column lists silently fail if a column is missing from the schema.
- **Step components in Create Campaign wizard** must be called as `Step1()` not `<Step1 />` (avoids focus loss).
- **middleware is named `proxy.js`** and exports `proxy` (not `middleware`) — Next.js 16 naming.
- **Git push works directly** from the BattleSphere terminal — GitHub token is embedded in the remote URL.
- If `git commit` fails with `HEAD.lock`: run `rm -f .git/HEAD.lock` (requires Cowork file delete permission).

---

## Likely next Phase 4 tasks

- Mobile responsiveness pass across all pages
- Invite system: join a campaign via a link or code (rather than requesting to join from the public page)
- Any further user testing feedback from live players

## Phase 5 (not started)
- Launch & grow / monetisation

---

## Supabase DB tables (all with RLS)
`profiles`, `campaigns`, `campaign_members`, `factions`, `territories`, `battles`, `territory_influence`, `campaign_events`, `achievements`, `join_requests`

Key columns to know:
- `territories.controlling_faction_id`
- `campaign_members.faction_id`
- `battles.attacker_player_id`, `battles.defender_player_id`, `battles.logged_by`
- `join_requests.status` — `'pending'` | `'approved'` | `'rejected'`
