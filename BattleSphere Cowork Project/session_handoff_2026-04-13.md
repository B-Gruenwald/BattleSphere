# BattleSphere — Session Handoff
**Date:** 2026-04-13  
**Project:** BattleSphere — https://www.battlesphere.cc  
**Local code:** `/Users/benjamingrunwald/Desktop/BattleSphere`  
**Stack:** Next.js 16.2, React 19, Tailwind CSS v4, Supabase, Vercel (auto-deploy on push)  
**Rules:** All files `.js` only (no TypeScript). Use `select('*')` for Supabase. Event handlers must be in `'use client'` components.

---

## What was built this session

### Cloudinary Photo Galleries — Battle Reports & Faction Showcases

**Database** — `BattleSphere Cowork Project/migration_cloudinary_photos.sql` (needs to be run ✓ if not already):
- `battle_photos` table: `id, battle_id, uploader_id, url, created_at` — stores Cloudinary URLs for battle report photos
- `faction_photos` table: `id, faction_id, uploader_id, url, created_at` — stores Cloudinary URLs for faction army showcases
- RLS: authenticated users can read all; uploader can insert their own; uploader can delete their own (wider deletions handled server-side via service role)

**`app/components/PhotoGallery.js`** — `'use client'` component used on both pages:
- Responsive grid (auto-fill, 160px min columns), 4:3 aspect-ratio thumbnails
- Click thumbnail → fullscreen lightbox overlay (click outside or × to close)
- `+ Add Photos` label/input — `multiple` attribute allows selecting several images at once
- Uploads sequentially with live progress counter ("Uploading 2 / 5…")
- Validates type (JPG/PNG/WebP/GIF) and size (max 10 MB) before any upload starts
- Uploads directly to Cloudinary via unsigned REST API (no server-side signing needed)
- POSTs resulting URL to our API route to save in Supabase
- Per-photo `×` delete button (visible to uploader or canManage users)
- Props: `photos`, `entityType` ('battle'|'faction'), `entityId`, `userId`, `canUpload`, `canManage`
- Renders nothing if Cloudinary env var is missing AND there are no photos

**`app/api/photos/battle/route.js`**:
- `POST` — auth required; saves `{ battleId, url }` to `battle_photos` via service role client
- `DELETE ?id=<photoId>` — checks uploader / logger / attacker / defender / campaign organiser before deleting

**`app/api/photos/faction/route.js`**:
- `POST` — auth required; saves `{ factionId, url }` to `faction_photos` via service role client
- `DELETE ?id=<photoId>` — checks uploader / faction member / campaign organiser before deleting

**`app/c/[slug]/battle/[id]/page.js`** — updated:
- Fetches `battle_photos` for this battle (ordered by `created_at` asc)
- Renders `<PhotoGallery>` before the Actions section
- `canUpload={canEdit}` and `canManage={canEdit}` — upload restricted to attacker, defender, logger, organiser

**`app/c/[slug]/faction/[id]/page.js`** — updated:
- Fetches `faction_photos` for this faction (ordered by `created_at` asc)
- Renders `<PhotoGallery>` before the Actions section
- `canUpload={canManagePhotos}` and `canManage={canManagePhotos}` — upload restricted to faction members and organiser

**`.env.local`** — `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` added with instructions (Benjamin to fill in cloud name)

**Cloudinary setup (done):**
- Free tier account created
- Upload preset `battlesphere_unsigned` created (unsigned signing mode)
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` added to Vercel env vars

---

## Planned next tasks (in order)

1. **Influence Tier 1** — selectable influence modes per campaign (standard / territory-only / off)
2. **Influence Tier 2** — event-linked mission bonuses (needs `mission_type` field on battle log)
3. **Influence Tier 3** — cascade influence via warp routes
4. **PostHog product analytics** — custom events at key journey moments

---

## Standard project rules (always apply)

- All files `.js` only — never `.tsx` or TypeScript syntax
- Always use `select('*')` for Supabase queries
- Avoid `.maybeSingle()` — use `.limit(1)` and `?.[0] ?? null` instead
- Event handlers must be in `'use client'` components
- Campaign roles: `'player'`, `'organiser'`, `'admin'` (lowercase); legacy `'Organiser'` (capital O) also exists in some DB rows
- Faction detail URL: `/c/[slug]/faction/[id]` (singular)
- Git remote has GitHub token embedded — `git push` works directly from terminal
- If `git commit` fails with HEAD.lock: request Cowork file delete permission, then `rm -f .git/HEAD.lock`
- `createAdminClient()` (service role) required for any server-side operation bypassing RLS
- `profiles` table has NO email column — use `supabase.auth.admin.getUserById(id)` server-side
- Supabase newly-added columns return `undefined` (not `null`) — always use `== null` (loose equality)
- The BattleSphere code folder is at `/Users/benjamingrunwald/Desktop/BattleSphere` — mount it separately from the "BattleSphere Cowork Project" outputs folder
