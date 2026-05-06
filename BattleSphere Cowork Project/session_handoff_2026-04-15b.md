BattleSphere — Session Handoff
Date: 2026-04-16
Project: BattleSphere — https://www.battlesphere.cc
Local code: `/Users/benjamingrunwald/Desktop/BattleSphere`
Stack: Next.js 16.2, React 19, Tailwind CSS v4, Supabase, Vercel (auto-deploy on push)
Rules: All files `.js` only (no TypeScript). Use `select('*')` for Supabase. Event handlers must be in `'use client'` components.

---

## What was built this session

### 1. Mission Eternal Chapter — SQL unit import
Generated a ready-to-run SQL script to bulk-insert 34 army units into the `army_units` table for the army named "Mission Eternal Chapter". Uses a CTE to resolve the army ID by name — no manual ID lookup needed.

File: `BattleSphere Cowork Project/insert_mission_eternal_units.sql`
Status: **Not yet run** — paste into Supabase SQL editor to execute.

Corrections applied in the script:
- Row VI "Infiltraror Squad" → "Infiltrator Squad" (typo fix)
- Row IV (MORDENT): `unit_type` set to `NULL` (was blank in source)

---

### 2. Army detail page — unit photo display redesign
**Before:** Full `PhotoGallery` component rendered below each unit card (multiple images, full grid).
**After:** Single thumbnail only, 44×44px square, inline in the header row on the far right of the unit name. Clicking opens a lightbox. Cards without photos are unaffected.

Reorder arrows (↑/↓) moved to a 36px-wide strip on the far right edge of the card (with a left border), separated cleanly from the content.

Final card layout:
```
| [name]  [unit type]       [44px thumbnail] | [↑] |
|                                             | [↓] |
```

Files changed:
- `app/components/ReorderableRoster.js` — removed `PhotoGallery` import; added inline thumbnail + lightbox state; restructured card to flex row with content area + ↑/↓ strip

Commits: `74123f3`, `a63bae0`

---

### 3. Password reset flow — fixed 404 on reset link
**Root cause:** `forgot-password/page.js` was setting `redirectTo` to `/reset-password`, but that page did not exist → 404 when clicking the email link.

**Fix:**
- `forgot-password/page.js` — `redirectTo` updated to `${origin}/auth/callback?next=/reset-password`, so the reset link routes through the existing callback handler (which exchanges the code for a session) before landing on the new page
- `app/reset-password/page.js` — **new file** — password form with New Password + Confirm Password fields; calls `supabase.auth.updateUser({ password })`; on success shows confirmation and redirects to `/dashboard` after 2.5s

Note: Any reset links sent **before this deploy** are still broken (old URL). Users who tried will need to request a fresh link.

Commit: `91dc292`

---

## ⚠️ Pending actions

| Item | Status |
|------|--------|
| `migration_crusade_unit_size.sql` | Not yet run — run in Supabase before testing Unit Size |
| `insert_mission_eternal_units.sql` | Not yet run — run in Supabase SQL editor |

---

## Current git state
All session changes pushed to `main`. Last commit: `91dc292`

```
91dc292 Fix password reset flow: route through auth/callback, add missing reset-password page
a63bae0 Swap thumbnail and reorder arrows: thumbnail inline in header, arrows on far right
74123f3 Show first-photo thumbnail on right of unit cards in army view
afbf491 Add Unit Size stat to Crusade Roster  ← previous session
```

---

## Pending backlog (in priority order)
1. Influence Tier 1 — selectable influence modes per campaign (standard / territory-only / off)
2. Influence Tier 2 — event-linked mission bonuses (needs `mission_type` field on battle log)
3. Influence Tier 3 — cascade influence via warp routes
4. PostHog product analytics — custom events at key journey moments

---

## Standard project rules (always apply)
- All files `.js` only — never `.tsx` or TypeScript syntax
- Always use `select('*')` for Supabase queries
- Avoid `.maybeSingle()` — use `.limit(1)` and `?.[0] ?? null` instead
- Event handlers must be in `'use client'` components — never in server components (causes 404/crash)
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
