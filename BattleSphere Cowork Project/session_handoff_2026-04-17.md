BattleSphere — Session Handoff
Date: 2026-04-17 Project: BattleSphere — https://www.battlesphere.cc Local code: `/Users/benjamingrunwald/Desktop/BattleSphere` Stack: Next.js 16.2, React 19, Tailwind CSS v4, Supabase, Vercel (auto-deploy on push) Rules: All files `.js` only (no TypeScript). Use `select('*')` for Supabase. Event handlers must be in `'use client'` components.

## What was built this session

### Bug fix — Player Standings XP (event bonus missing, carried from 2026-04-16)

* `app/c/[slug]/page.js` and `app/c/[slug]/players/page.js` were selecting battles without `event_xp_bonus`, causing `calcPlayerXP()` to silently zero out any event XP bonus. Added `event_xp_bonus` to both queries.
* Players page: changed sort from wins descending to `localeCompare` by username (A–Z).

### Feature — Weekly Chronicle Reports (Deployment Report / Crusade Report)

SQL migration run ✓: `migration_weekly_updates.sql`
Additional fix run ✓: `ALTER TABLE chronicle_weekly_updates ADD COLUMN IF NOT EXISTS is_catch_up BOOLEAN NOT NULL DEFAULT FALSE;`
RLS fix run ✓: replaced direct EXISTS subquery with `public.is_campaign_member(campaign_id)` (same pattern as all other tables)

Two new Chronicle entry types, auto-generated every Friday at 08:00 UTC by the cron at `/api/cron/weekly-updates`:

**Deployment Report** (`hobby_progress`) — covers the previous Mon–Sun window:
- New armies registered to the campaign (`campaign_army_records` created)
- New units added to any army registered in the campaign (`army_units` created)

**Crusade Report** (`army_progress`) — covers the previous Mon–Sun window:
- Units newly enlisted to a Crusade roster (`crusade_unit_records` created)
- Units whose stats were updated — XP, kills, upgrades (`crusade_unit_records.updated_at`)
- Army-level stat changes — supply, requisition, notes (`campaign_army_records.updated_at`)

**First-run catch-up:** if a campaign has never had a weekly update generated, the cron uses `campaign.created_at → now` as the window instead of the previous week, writing a one-time "Campaign History" entry. Subsequent runs use the normal weekly window.

**Army links:** army names in both report types are hyperlinked to `/armies/[id]`. Lines are stored as structured objects `{ text, army_id, army_name }` in the JSONB content. The component handles legacy string lines (backward-compatible).

**Diagnostic / manual trigger:**
```js
// Dry run — see what would be written without writing:
fetch("https://www.battlesphere.cc/api/cron/weekly-updates?dry=true", {
  headers: { "Authorization": "Bearer YOUR_CRON_SECRET" }
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))

// Live run:
fetch("https://www.battlesphere.cc/api/cron/weekly-updates", {
  headers: { "Authorization": "Bearer YOUR_CRON_SECRET" }
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))
```

**To force re-generation of catch-up entries** (e.g. after a content format change): `DELETE FROM chronicle_weekly_updates;` in Supabase SQL Editor, then re-run the cron.

Files changed:
* `BattleSphere Cowork Project/migration_weekly_updates.sql` — `chronicle_weekly_updates` table + RLS (run ✓)
* `app/api/cron/weekly-updates/route.js` — cron handler; first-run catch-up; `?dry=true` mode; structured line objects with army_id; army lines grouped by army (not player)
* `vercel.json` — added `{ "path": "/api/cron/weekly-updates", "schedule": "0 8 * * 5" }`
* `app/components/WeeklyUpdateEntry.js` — client component; expand/collapse; blue for Deployment, purple for Crusade; `LineText` helper renders army name as link or falls back to plain string
* `app/c/[slug]/chronicle/page.js` — fetches `chronicle_weekly_updates`, merges as `weekly_update` type, added legend chip
* `app/c/[slug]/page.js` — dashboard Latest Chronicle now includes weekly updates (compact row, links to full Chronicle)

### Feature — Record Battle in Another Campaign

SQL migration run ✓: `migration_link_battle.sql`

Allows battle participants to record the same real-world game in a second campaign. Creates a full copy of the battle row with the target campaign's factions, territory, and influence/XP applied independently.

**UI:** "Record in Another Campaign" button on Battle Detail page, visible only to the attacker and defender players. Opens a dropdown panel with:
- Campaign selector (only campaigns where both players are members)
- Territory selector (optional, populated from selected campaign)
- Attacker and Defender faction selectors (pre-filled from player memberships, overridable)

**Data model:** new `source_battle_id UUID` column on `battles` (FK → `battles.id` ON DELETE SET NULL). Linked copy is a full `battles` row in the target campaign. Winner is remapped by attacker-won/defender-won logic (not faction ID).

**Cross-campaign badge:** Battle Detail page shows a "Multi-Campaign Record" panel listing "Originally fought in [Campaign]" (on copies) or "Also recorded in [Campaign]" (on originals).

Files changed:
* `BattleSphere Cowork Project/migration_link_battle.sql` — `source_battle_id` column + index (run ✓)
* `app/api/battles/link-options/route.js` — GET endpoint; returns eligible campaigns with territories, factions, and auto-suggested faction IDs from memberships
* `app/api/battles/link-to-campaign/route.js` — POST endpoint; inserts linked battle, applies base influence + `applyEventBonuses()` + `applyTerritoryCascade()` for target campaign
* `app/components/AddToCampaignPanel.js` — 'use client' dropdown panel component
* `app/c/[slug]/battle/[id]/page.js` — "Record in Another Campaign" button + Multi-Campaign Record badge; queries `source_battle_id` (original) and linked copies

## Current git state

All session changes pushed to `main`. Last commit: `543c848`

```
543c848 Weekly updates: link army names to army pages in Chronicle entries
5706b60 Campaign dashboard: add weekly Chronicle reports to Latest Chronicle summary
8034aaf Weekly updates cron: surface errors + add ?dry=true diagnostic mode
e27af8b Weekly updates: first-run catch-up covers full campaign history
88040fd Add weekly Chronicle reports + cross-campaign battle linking
f992f1e Players page: sort alphabetically by username instead of wins
b4af249 Fix: include event_xp_bonus in battle queries for Player Standings
```

⚠️ Pending actions
None — all SQL migrations have been run.

## Pending backlog (in priority order)

1. PostHog product analytics — custom events at key journey moments
2. Marketing one-pager — document to send to player groups inviting them to join. Three use cases: (1) Track your Gaming Group League, (2) Manage a map-based narrative campaign, (3) Players showing off armies / Crusade-style progress. Format shortlisted to either a PDF one-pager or an HTML landing page on BattleSphere itself. Open question before writing: is the outreach cold (unknown club organisers) or warm (existing communities where Benjamin already has a presence)? That shapes the tone. Screenshots to be included as illustrations. Tease of future features at the end.

## Standard project rules (always apply)

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
* `chronicle_weekly_updates` table: `(campaign_id, update_type, week_start)` unique; `is_catch_up BOOLEAN`; content is `JSONB` array of `{ player_id, username, lines: Array<string | { text, army_id, army_name }> }`; RLS uses `public.is_campaign_member(campaign_id)`
* `source_battle_id UUID` on `battles` — FK to `battles.id` ON DELETE SET NULL; non-null on linked copies, null on originals
