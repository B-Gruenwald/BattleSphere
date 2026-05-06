BattleSphere — Session Handoff
Date: 2026-04-16 Project: BattleSphere — https://www.battlesphere.cc Local code: `/Users/benjamingrunwald/Desktop/BattleSphere` Stack: Next.js 16.2, React 19, Tailwind CSS v4, Supabase, Vercel (auto-deploy on push) Rules: All files `.js` only (no TypeScript). Use `select('*')` for Supabase. Event handlers must be in `'use client'` components.
What was built this session
Influence Tier 1 (carried over — SQL now run ✓)

* `migration_influence_mode.sql` — run ✓
* Selectable influence mode per campaign: Standard / Victory Points / Manual
* `AdminCampaignSettings.js`, `BattleLogForm.js`, `BattleEditForm.js`, `AdminBattleManager.js`, `app/lib/influence.js` all updated

Influence Tier 2 — Event-linked influence & XP bonuses
All SQL migrations run ✓

* `migration_influence_tier2.sql` + `migration_influence_tier2b.sql` — run ✓
* Campaign organisers configure an optional Influence Bonus on any Campaign Event
* Bonus amount (flat integer) + up to three conditions: territory (multi-select), battle type (chip multi-select), faction involved (chip multi-select)
* AND logic across condition types; OR within each type
* Bonus awarded to BOTH factions (territory influence) and BOTH players (XP) when a qualifying battle is logged while the event is `active`
* Reversal on battle delete handled via `battle_event_bonuses` audit table

Influence Tier 3 — Territory Cascade
SQL migration run ✓

* `migration_influence_tier3.sql` — run ✓
* Organisers configure an optional Territory Cascade on any Campaign Event (independent of and combinable with the Tier 2 Influence Bonus)
* Organiser picks a trigger territory (main/top-level only) and a flat cascade bonus amount
* When a battle is **won** at that territory (or any of its sub-territories) while the event is `active`:
  * The winning faction gains `cascade_bonus` influence in every territory directly connected via a warp route
  * Draws never trigger a cascade. XP is not affected.
* Reversal on battle delete handled via `battle_cascade_bonuses` audit table
* Named "Territory Cascade" (not "Warp Route Cascade") so the concept works for non-40k campaign types (e.g. Realm Gate Connections in High Fantasy)

Files changed:

* `app/lib/influence.js` — `applyTerritoryCascade()` and `reverseTerritoryCascade()` added
* `app/components/EventForm.js` — Territory Cascade section (toggle, bonus amount, main-territory-only dropdown)
* `app/components/BattleLogForm.js` — calls `applyTerritoryCascade()` after `applyEventBonuses()`
* `app/components/BattleEditForm.js` + `AdminBattleManager.js` — calls `reverseTerritoryCascade()` on delete
* `app/c/[slug]/events/[id]/page.js` — cascade badge (↝) in header; cascade summary panel below body
* `app/c/[slug]/events/page.js` — ↝ badge and compact cascade summary line on each event card
* `app/c/[slug]/page.js` — cascade summary line on Active Events strip cards
* `app/c/[slug]/battle/[id]/page.js` — Territory Cascade card showing per-territory breakdown

Battle detail pages made public
SQL migration run ✓

* `migration_battle_detail_public.sql` — run ✓
* Battle detail pages (`/c/[slug]/battle/[id]`) are now publicly accessible — no login required
* Anyone with the URL can view the full battle record (result, narrative, photos, event bonuses, cascade bonuses)
* Logged-in players who participated still see the Edit button; anonymous visitors see read-only view
* Added anon read RLS policies for `battle_photos`, `battle_event_bonuses`, `battle_cascade_bonuses` (battles, factions, profiles, territories already had anon read from `migration_public_access.sql`)

Current git state
All session changes pushed to `main`. Last commit: `6f9a13a`

```
6f9a13a Make battle detail pages publicly shareable
c106b91 Influence Tier 3: Territory Cascade on Campaign Events
e8efe47 Campaign dashboard: add bonus summary line to event cards
d2b545d Events list: show influence bonus summary on each event card
```

⚠️ Pending actions
None — all SQL migrations have been run.

Pending backlog (in priority order)

1. PostHog product analytics — custom events at key journey moments

Standard project rules (always apply)

* All files `.js` only — never `.tsx` or TypeScript syntax
* Always use `select('*')` for Supabase queries
* Avoid `.maybeSingle()` — use `.limit(1)` and `?.[0] ?? null` instead
* Event handlers must be in `'use client'` components — never in server components (causes 404/crash)
* All `<input>` and `<textarea>` elements must use `fontSize: '1rem'` (≥16px) — prevents iOS Safari auto-zoom jump
* Campaign roles: `'player'`, `'organiser'`, `'admin'` (lowercase); legacy `'Organiser'` (capital O) also exists in some DB rows
* Faction detail URL: `/c/[slug]/faction/[id]` (singular)
* Army detail URL: `/armies/[id]` (top-level, no slug)
* Player profile URL: `/c/[slug]/player/[userId]`
* Git remote has GitHub token embedded — `git push` works directly from terminal
* If `git commit` fails with HEAD.lock: request Cowork file delete permission, then `rm -f .git/HEAD.lock`
* `createAdminClient()` (service role) required for any server-side operation bypassing RLS
* `profiles` table has NO email column — use `supabase.auth.admin.getUserById(id)` server-side
* Supabase newly-added columns return `undefined` (not `null`) — always use `== null` (loose equality)
* The BattleSphere code folder is at `/Users/benjamingrunwald/Desktop/BattleSphere` — mount it separately from the "BattleSphere Cowork Project" outputs folder
* Cloudinary upload preset: `battlesphere_unsigned` (unsigned); env var: `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
* `sort_order` column exists on `army_units` but NOT on `territories` — territories order by `depth` then `name`
* `influence_mode` column on `campaigns`: `'standard'` | `'victory'` | `'off'` (default `'standard'`)
* `bonus_territory_ids UUID[]`, `bonus_battle_types TEXT[]`, `bonus_faction_ids UUID[]` on `campaign_events` — always arrays, never single values
* `cascade_bonus INTEGER`, `cascade_territory_id UUID` on `campaign_events` — Territory Cascade config; null = no cascade
* `battle_event_bonuses` table records Tier 2 event bonuses applied to each battle (for reversal on delete)
* `battle_cascade_bonuses` table records Tier 3 cascade bonuses per territory per battle (for reversal on delete)
* `event_xp_bonus INTEGER` on `battles` — flat XP bonus from Tier 2 events, included in `calcPlayerXP()`
* Territory Cascade only fires on battles with a winner (draws never cascade). XP unaffected by cascade.
* Battle detail pages are publicly accessible (no login required) — anon read RLS in place for all queried tables
