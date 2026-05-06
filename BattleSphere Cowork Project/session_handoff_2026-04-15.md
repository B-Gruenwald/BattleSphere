# BattleSphere — Session Handoff
**Date:** 2026-04-15  
**Project:** BattleSphere — https://www.battlesphere.cc  
**Local code:** `/Users/benjamingrunwald/Desktop/BattleSphere`  
**Stack:** Next.js 16.2, React 19, Tailwind CSS v4, Supabase, Vercel (auto-deploy on push)  
**Rules:** All files `.js` only (no TypeScript). Use `select('*')` for Supabase. Event handlers must be in `'use client'` components.

---

## What was built this session

### 1. iOS/iPad input zoom-jump fix (sitewide)

**Root cause:** iOS Safari auto-zooms the viewport whenever a focused `<input>` or `<textarea>` has `font-size < 16px`, causing a jarring page jump. Reported by tester TheNamad on the Edit Map page.

**Fix applied:** All `inputStyle` font sizes across the app bumped from sub-1rem values (0.82–0.95rem) to exactly `1rem` (16px). **20 files total** — the initial fix to `MapEditForm.js` plus a sitewide pass:

`app/components/MapEditForm.js` (first fix), then:
`admin/send-onboarding/page.js`, `armies/[id]/edit/ArmyEditClient.js`, `armies/new/ArmyCreateClient.js`, `campaign/new/page.js`, `components/AchievementForm.js`, `components/AdminCampaignSettings.js`, `components/AdminFactionEditor.js`, `components/AdminPlayerSearch.js`, `components/BattleEditForm.js`, `components/BattleLogForm.js`, `components/CampaignArmySection.js`, `components/CrusadeRoster.js`, `components/EventForm.js`, `components/FeedbackButton.js`, `components/InfluenceOverrideForm.js`, `components/SetFactionForm.js`, `components/StandaloneBattleForm.js`, `app/login/page.js`, `app/register/page.js`

Labels, error messages, and decorative `<span>` / `<p>` tags were deliberately left at their smaller sizes — they are never focused and do not trigger the zoom.

---

### 2. Dashboard mobile responsiveness

**Problem:** The three-column dashboard grid (`1fr 1fr 280px`) was a hardcoded inline style — no media queries possible. Columns didn't stack on mobile or tablet.

**Fix:**
- Added `.dashboard-grid` CSS class to `app/globals.css` with three responsive breakpoints:
  - **≥901px:** `1fr 1fr 280px` (original three columns)
  - **601–900px:** `1fr 1fr` — Armies + Campaigns side by side; Recent Battles spans full width below
  - **≤600px:** `1fr` — all three sections stack
- Replaced inline `style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 280px', … }}` on the grid wrapper in `app/dashboard/page.js` with `className="dashboard-grid"`

---

### 3. "My Profile" button on Campaign Dashboard header

Members now see a **"My Profile"** button in the campaign header action row, between the faction chooser and "Share Public Page ↗". It links directly to their own player profile page: `/c/[slug]/player/[userId]`.

**Files changed:**
- `app/c/[slug]/page.js` — passes two new props to `CampaignHeaderActions`: `isMember={!!isMember}` and `userId={user.id}`
- `app/components/CampaignHeaderActions.js` — accepts `isMember` and `userId`; renders the button only when both are truthy (hidden for non-members and visitors)

**Button order in header:** Faction chooser (conditional) → My Profile (members only) → Share Public Page ↗ → Admin (organisers only)

---

### 4. Unit Size stat on Crusade Roster

Added **Unit Size** as the first stat displayed and edited on every Crusade unit row.

**⚠️ Migration required — run in Supabase SQL editor:**  
`BattleSphere Cowork Project/migration_crusade_unit_size.sql`  
(Single `ALTER TABLE crusade_unit_records ADD COLUMN IF NOT EXISTS unit_size int NOT NULL DEFAULT 0`)

**Files changed:**
- `app/components/CrusadeRoster.js` — `unit_size` added as first entry in `UNIT_STAT_FIELDS` (label: "Unit Size", short: "Size"); added to form initial state (`cur.unit_size ?? 0`)
- `app/api/crusade-units/[id]/route.js` — `unit_size` added to the PUT handler's `allowed` fields array

Display order in the stat pill row: **Size · XP · Kills · CP**

---

## Carried over from previous session (2026-04-14)

Player profile layout, Army view / Edit Army compression, and unit reordering — all live on main. See `session_handoff_2026-04-14.md` for full details.

---

## ⚠️ Pending migration

| File | Status |
|---|---|
| `migration_crusade_unit_size.sql` | **Not yet run** — run in Supabase before testing Unit Size |

---

## Current git state

All session changes pushed to `main`. Last commit: `afbf491` — "Add Unit Size stat to Crusade Roster"

```
afbf491 Add Unit Size stat to Crusade Roster
7b9feec Add My Profile button to campaign dashboard header
44ada04 Fix dashboard grid: stack columns on mobile/tablet
f016e46 Fix iOS/iPad input zoom-jump across all form components
8275866 Fix iOS/iPad input zoom-jump on Edit Map page
```

---

## Pending backlog (in priority order)

1. **Influence Tier 1** — selectable influence modes per campaign (standard / territory-only / off)
2. **Influence Tier 2** — event-linked mission bonuses (needs `mission_type` field on battle log)
3. **Influence Tier 3** — cascade influence via warp routes
4. **PostHog product analytics** — custom events at key journey moments

---

## Standard project rules (always apply)

- All files `.js` only — never `.tsx` or TypeScript syntax
- Always use `select('*')` for Supabase queries
- Avoid `.maybeSingle()` — use `.limit(1)` and `?.[0] ?? null` instead
- Event handlers must be in `'use client'` components — **never in server components** (causes 404/crash)
- All `<input>` and `<textarea>` elements must use `fontSize: '1rem'` (≥16px) — prevents iOS Safari auto-zoom jump
- Campaign roles: `'player'`, `'organiser'`, `'admin'` (lowercase); legacy `'Organiser'` (capital O) also exists in some DB rows
- Faction detail URL: `/c/[slug]/faction/[id]` (singular)
- Army detail URL: `/armies/[id]` (top-level, no slug)
- Player profile URL: `/c/[slug]/player/[userId]`
- Git remote has GitHub token embedded — `git push` works directly from terminal
- If `git commit` fails with HEAD.lock: request Cowork file delete permission, then `rm -f .git/HEAD.lock`
- `createAdminClient()` (service role) required for any server-side operation bypassing RLS
- `profiles` table has NO email column — use `supabase.auth.admin.getUserById(id)` server-side
- Supabase newly-added columns return `undefined` (not `null`) — always use `== null` (loose equality)
- The BattleSphere code folder is at `/Users/benjamingrunwald/Desktop/BattleSphere` — mount it separately from the "BattleSphere Cowork Project" outputs folder
- Cloudinary upload preset: `battlesphere_unsigned` (unsigned); env var: `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `sort_order` column exists on `army_units` — used in all fetch queries for unit ordering
