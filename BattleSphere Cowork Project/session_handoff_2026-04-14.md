# BattleSphere — Session Handoff
**Date:** 2026-04-14  
**Project:** BattleSphere — https://www.battlesphere.cc  
**Local code:** `/Users/benjamingrunwald/Desktop/BattleSphere`  
**Stack:** Next.js 16.2, React 19, Tailwind CSS v4, Supabase, Vercel (auto-deploy on push)  
**Rules:** All files `.js` only (no TypeScript). Use `select('*')` for Supabase. Event handlers must be in `'use client'` components.

---

## What was built this session

### Army Portfolio — Phase A (player-level army showcase)

**Database** — `BattleSphere Cowork Project/migration_army_portfolio.sql` ✓ run in Supabase:
- `armies` table: `id, player_id, name, game_system, faction_name, tagline, backstory, cover_image_url, is_public, created_at, updated_at`
- `army_units` table: `id, army_id, name, unit_type, description, sort_order, created_at`
- `army_unit_photos` table: `id, unit_id, uploader_id, url, caption, created_at`
- RLS: public can read public armies; owner can CRUD their own armies/units; uploader can delete photos

**API routes:**
- `app/api/armies/route.js` — POST (create army)
- `app/api/armies/[id]/route.js` — PUT (update), DELETE (delete; cascades to units + photos)
- `app/api/army-units/route.js` — POST (create unit, verifies caller owns parent army)
- `app/api/army-units/[id]/route.js` — PUT (update unit), DELETE (delete unit)
- `app/api/photos/army-unit/route.js` — POST (save Cloudinary URL to army_unit_photos), DELETE

**`app/components/PhotoGallery.js`** — updated to support `entityType="army-unit"`:
- POSTs `{ unitId: entityId, url }` to `/api/photos/army-unit`
- Previously only supported `battle` and `faction` entity types

**`app/components/ArmyCard.js`** — `'use client'` component mirroring CampaignCard exactly:
- Same padding, icon top-left (◆ default; ☩ for 40K; ⚔ for Age of Sigmar etc.), faction badge top-right
- Army name, system·faction subtitle, optional tagline
- Gold border on hover via useState

**Pages (top-level routes, not campaign-scoped):**
- `app/armies/new/page.js` + `ArmyCreateClient.js` — auth-gated create form (name, system, faction, tagline); redirects to edit page on save
- `app/armies/[id]/page.js` — public army page: cover image banner, backstory, unit roster with per-unit PhotoGallery; edit button for owner
- `app/armies/[id]/edit/page.js` + `ArmyEditClient.js` — full edit page:
  - Section 1: army metadata + cover image upload (Cloudinary, inline)
  - Section 2: inline unit manager — add/edit/delete units, per-unit PhotoGallery, per-unit save button
  - Section 3: danger zone (delete army with confirmation)

**Dashboard (`app/dashboard/page.js`)** — restructured to three-column layout:
- **Order:** My Armies | My Campaigns | Recent Battles
- **Grid:** `1fr 1fr 280px`
- All three columns use identical heading structure (flex wrapper + h2 with `margin:0, lineHeight:1`) to ensure pixel-perfect vertical alignment
- Armies column uses `<ArmyCard>` components, matching CampaignCard sizing and style
- Recent Battles column: heading above, single bordered box containing the list

**`app/c/[slug]/player/[userId]/page.js`** — Army Portfolio section added:
- Fetches player's armies (public only for other viewers; all for own profile)
- Shows army cards below the Faction section
- Own-profile view shows "+ New Army" link and "Edit →" per card

---

## Key architecture notes for Army Portfolio

- Armies are **user-level** (not campaign-scoped) — one army can appear in multiple campaigns
- Phase B (not yet built): `campaign_army_records` table to link armies to campaigns with campaign-specific notes and Crusade tracking
- Army page URL: `/armies/[id]` (top-level, no campaign slug)
- Cover image: single Cloudinary upload inline in edit form (not using PhotoGallery)
- Unit photos: use PhotoGallery with `entityType="army-unit"` and `entityId=unit.id`
- `select('*, armies(player_id)')` pattern used in army-units API for ownership checks via join

---

## Planned next tasks (in order)

1. **Influence Tier 1** — selectable influence modes per campaign (standard / territory-only / off)
2. **Influence Tier 2** — event-linked mission bonuses (needs `mission_type` field on battle log)
3. **Influence Tier 3** — cascade influence via warp routes
4. **Army Portfolio Phase B** — link armies to campaigns (`campaign_army_records` table), Crusade tracking
5. **PostHog product analytics** — custom events at key journey moments

---

## Standard project rules (always apply)

- All files `.js` only — never `.tsx` or TypeScript syntax
- Always use `select('*')` for Supabase queries
- Avoid `.maybeSingle()` — use `.limit(1)` and `?.[0] ?? null` instead
- Event handlers must be in `'use client'` components — **never in server components** (causes 404/crash)
- Campaign roles: `'player'`, `'organiser'`, `'admin'` (lowercase); legacy `'Organiser'` (capital O) also exists in some DB rows
- Faction detail URL: `/c/[slug]/faction/[id]` (singular)
- Army detail URL: `/armies/[id]` (top-level, no slug)
- Git remote has GitHub token embedded — `git push` works directly from terminal
- If `git commit` fails with HEAD.lock: request Cowork file delete permission, then `rm -f .git/HEAD.lock`
- `createAdminClient()` (service role) required for any server-side operation bypassing RLS
- `profiles` table has NO email column — use `supabase.auth.admin.getUserById(id)` server-side
- Supabase newly-added columns return `undefined` (not `null`) — always use `== null` (loose equality)
- The BattleSphere code folder is at `/Users/benjamingrunwald/Desktop/BattleSphere` — mount it separately from the "BattleSphere Cowork Project" outputs folder
- Cloudinary upload preset: `battlesphere_unsigned` (unsigned); env var: `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
