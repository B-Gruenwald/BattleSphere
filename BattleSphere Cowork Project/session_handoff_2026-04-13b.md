# BattleSphere Session Handoff — 2026-04-13 (Session 2)

## What was completed this session

### 1. Player profile layout deployed (carried over from Session 1)
The compact player profile redesign was pushed and is live:
- `app/components/FactionChangeInline.js` — faction dot + inline change toggle ('use client')
- `app/components/BattleHistoryPanel.js` — shows 5 battles, "See all →" expands ('use client')
- `app/c/[slug]/player/[userId]/page.js` — rewritten JSX: compact hero row (48px avatar, name, W/D/L, rank, achievements), two-column grid (Campaign Army left, Battles + Army Portfolio right)
- SQL migrations confirmed run: `migration_campaign_army_records_rls_fix.sql` + `migration_crusade_unit_records.sql`

### 2. Army view page compressed (`app/armies/[id]/page.js`)
- Outer padding: 3rem → 1.5rem
- Section gaps: 2.5rem → 1.25rem
- Cover image marginBottom: 2.5rem → 1.25rem
- Army header: compact hero row — name + meta pills + tagline + Edit button in one flex block
- Backstory: padding 1.75rem → 1rem 1.25rem
- Unit cards: gap 2rem → 0.75rem, padding 1.75rem → 1rem 1.25rem
- Breadcrumb: font 0.8rem → 0.75rem

### 3. Edit Army page compressed (`app/armies/[id]/edit/ArmyEditClient.js`)
- Outer padding: 3rem 2rem → 1.5rem
- sectionStyle: padding 1.75rem → 1.1rem 1.25rem, marginBottom 2rem → 1rem
- sectionHeadingStyle: marginBottom 1.5rem → 1rem
- h1: clamp(1.4rem…2rem) → clamp(1.1rem…1.5rem)
- Form field gap: 1.25rem → 0.9rem
- Unit card padding: 1.5rem → 1rem 1.1rem; description minHeight: 80px → 60px
- AddUnitForm: padding 1.5rem → 1rem 1.1rem; description minHeight: 70px → 55px
- Danger Zone: padding 1.5rem → 1rem 1.25rem

### 4. Unit reordering — Edit Army page
New API: `app/api/army-units/reorder/route.js`
- `POST /api/army-units/reorder` — accepts `{ armyId, ids: [uuid, ...] }`, verifies army ownership, batch-updates `sort_order` (0-indexed) via `Promise.all`; scopes each update to `.eq('army_id', armyId)` for safety

UI changes in `ArmyEditClient.js`:
- `UnitCard` gets `onMoveUp`, `onMoveDown`, `isReordering` props
- Each card has a compact ↑ / ↓ button strip in the top-right corner (dimmed and disabled when at boundary or while saving)
- `moveUnit(index, dir)` in parent: swaps local array optimistically, then fires reorder API
- `reordering` state disables all buttons while in-flight

### 5. Unit reordering — Army view page
New component: `app/components/ReorderableRoster.js` ('use client')
- Accepts `{ initialUnits, armyId, isOwner, photosByUnit, userId }`
- Shows ↑/↓ buttons inline in the unit name row — only when `isOwner === true`; invisible to other visitors
- Reuses same `/api/army-units/reorder` endpoint and optimistic update pattern
- Replaces the static unit map in `app/armies/[id]/page.js`; `PhotoGallery` import moved into the new component

## Current git state
All changes pushed to `main`. Recent commits:
```
1fc8279 Add unit reordering to Army view page
54a061d Add unit reordering to Edit Army page
0b3a7a1 Compress Army and Edit Army pages: tighter spacing and padding
e601a1c Compress player profile: hero row, two-column layout, battle history panel
```

## Technical reminders (carry forward)
- All files `.js` only — never TypeScript
- Always `select('*')` for Supabase queries
- Never `.maybeSingle()` — use `.limit(1)` + `?.[0] ?? null`
- Newly-added Supabase columns return `undefined` — use `== null` (loose equality)
- `profiles` table has no email column — use `supabase.auth.admin.getUserById(id)` server-side
- Campaign roles: `'player'`, `'organiser'`, `'admin'` (lowercase); legacy `'Organiser'` also exists
- Cloudinary unsigned preset: `battlesphere_unsigned`; env var: `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `sort_order` column already exists on `army_units` — used in all fetch queries
- Git: `git push` works directly (token embedded in remote). HEAD.lock fix: request Cowork file delete → `rm -f .git/HEAD.lock`
- `createAdminClient()` bypasses RLS; use it server-side for public pages
- XP rank system: Fresh (0), Blooded (1+), Battle-Hardened (4+), Heroic (8+), Legendary (12+)

## Pending backlog (in priority order)
1. **Influence Tier 1** — selectable influence modes per campaign (standard / territory-only / off)
2. **Influence Tier 2** — event-linked mission bonuses (needs `mission_type` field on battle log)
3. **Influence Tier 3** — cascade influence via warp routes
4. **PostHog analytics** — custom events at key journey moments

## Key files reference
| File | Purpose |
|------|---------|
| `app/armies/[id]/page.js` | Army view (public; owner sees ↑/↓ via ReorderableRoster) |
| `app/armies/[id]/edit/ArmyEditClient.js` | Edit Army client component (owner only) |
| `app/components/ReorderableRoster.js` | Client component: unit list with optional reorder buttons |
| `app/api/army-units/reorder/route.js` | POST: batch sort_order update |
| `app/api/army-units/[id]/route.js` | PUT/DELETE individual unit (already handles sort_order) |
| `app/c/[slug]/player/[userId]/page.js` | Player profile (public, compressed layout) |
| `app/components/CampaignArmySection.js` | Crusade stats + roster (player profile left col) |
| `app/components/CrusadeRoster.js` | Unit-level XP/Kills/CP/Upgrades/Scars |
| `app/components/BattleHistoryPanel.js` | Battle history (5 shown, expandable) |
| `app/components/FactionChangeInline.js` | Inline faction switcher |
| `app/api/campaign-army-records/route.js` | POST: link army to campaign |
| `app/api/campaign-army-records/[id]/route.js` | PUT/DELETE: update/unlink (owner or organiser) |
| `app/api/crusade-units/route.js` | POST: enlist unit into crusade force |
| `app/api/crusade-units/[id]/route.js` | PUT/DELETE: update/remove crusade unit |
