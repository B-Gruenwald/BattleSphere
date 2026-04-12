# BattleSphere — Session Handoff
**Date:** 2026-04-12  
**Project:** BattleSphere — https://www.battlesphere.cc  
**Local code:** `/Users/benjamingrunwald/Desktop/BattleSphere`  
**Stack:** Next.js 16.2, React 19, Tailwind CSS v4, Supabase, Vercel (auto-deploy on push)  
**Rules:** All files `.js` only (no TypeScript). Use `select('*')` for Supabase. Event handlers must be in `'use client'` components.

---

## What was built this session

### 1. Bulletin Drawer — New Dispatch + Delete flows

**`app/components/BulletinDrawer.js`** received major additions:

- **"+ New Dispatch" button** — appears in the bulletin panel footer (organiser/admin only, only when a current dispatch already exists). Clicking it opens the drawer with a blank form and auto-increments `dispatch_number`. On save, it sets the old dispatch to `is_current = false`, inserts the new one as `is_current = true`, and prepends the old dispatch to the "Previous Dispatches" accordion immediately (no page reload needed).

- **"Delete Dispatch" button** — appears at the bottom of the edit form, red-bordered, only for existing dispatches (not when creating a new one). Uses `window.confirm()` before deleting. On deletion, the most recent previous dispatch (if any) is promoted to `is_current = true`.

New state variables added: `isNewDispatch`, `deleting`, `livePreviousDispatches`.

`handleSave()` now has three paths:
1. `isNewDispatch && liveDispatch?.id` → UPDATE old to `is_current=false`, INSERT new
2. `liveDispatch?.id` → UPDATE existing (standard edit)
3. else → INSERT first-ever dispatch

Previous dispatches accordion now uses `livePreviousDispatches` state so it updates instantly on new dispatch or delete, without a page reload.

---

### 2. Faction auto-links in bulletin text — gold colour

**`app/globals.css`** — `.bulletin-faction-link` changed from `var(--text-primary)` to `var(--text-gold)`, hover changes to `var(--gold-bright)` with a stronger `border-bottom`. Territory links remain the default subtle style; faction links are now visually distinct and gold.

---

### 3. "Log a Battle" button — always-visible in global nav

Moved the "Log a Battle" button out of `CampaignNavLinks` (which lives inside `site-nav__desktop` and is hidden on mobile behind the burger menu) into the global `NavBar.js`, where it sits next to the BattleSphere wordmark.

**`app/components/NavBar.js`** changes:
- Added `import { usePathname } from 'next/navigation'`
- Added `import PublicCampaignNavCTA from './PublicCampaignNavCTA'`
- Uses `usePathname()` to extract `campaignSlug` from `/c/[slug]/...` paths
- Uses `usePathname()` to extract `publicCampaignSlug` from `/campaign/[slug]/...` paths
- Left side of nav is now a flex row:
  ```jsx
  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
    <Link href="/" className="site-nav__logo">BattleSphere</Link>
    {user && campaignSlug && (
      <Link href={`/c/${campaignSlug}/battle/new`}>
        <button className="btn-primary nav-log-battle">+ Log a Battle</button>
      </Link>
    )}
    {publicCampaignSlug && (
      <PublicCampaignNavCTA slug={publicCampaignSlug} />
    )}
  </div>
  ```
- The button is **never** inside the mobile dropdown — always visible.

**`app/globals.css`** — Added `.nav-log-battle` class:
```css
.nav-log-battle {
  padding: 0.35rem 0.85rem;
  font-size: 0.55rem;
}
```

**`app/components/CampaignNavLinks.js`** — Removed the "Log Battle" button from both desktop and mobile sections, removed unused `LOG_BTN_STYLE` constant.

---

### 4. Public campaign page — full overhaul

**`app/campaign/[slug]/page.js`** redesigned from scratch to mirror the member dashboard layout.

New layout (top to bottom):
1. Thin "◆ Public Campaign Page" banner at the very top. If the current user is already a member, shows "Go to Campaign Dashboard →" link in the banner.
2. **Hero row** — BulletinPanel (left) + CampaignMap (right) with "Full Map →" link
3. **Events strip** — active/upcoming events, same as dashboard
4. **Stats bar** — Factions · Players · Battles · Territories · Active Events · Current Act
5. **Bottom row** — 3 columns:
   - Faction Standings with links to `/c/[slug]/faction/[id]`
   - Player Standings (XP)
   - Chronicle (recent battles + events + achievements, with links)

No "Join" CTA on the page itself — access request is handled entirely via the global nav CTA (see section 5).

Data fetched: factions, territories, influence, warpRoutes, allBattles, activeEvents, recentBattles, recentEvents, recentAchievements, members, profiles, bulletin.

---

### 5. "Request Access" CTA — always-visible in global nav

**`app/components/PublicCampaignNavCTA.js`** — New `'use client'` component shown in the global nav bar when the visitor is on a `/campaign/[slug]` page.

Fetches its own state on mount via the Supabase browser client. States:

| State | What renders |
|---|---|
| `loading` / `rejected` | Nothing (null) |
| `member` | "Campaign Dashboard →" gold button → `/c/${slug}` |
| `pending` | "⏳ Request Pending" text badge |
| `email-form` (not logged in) | "Request Access" button; clicking opens a dropdown card with email input → POST `/api/request-access`; on success shows "✓ Invite sent — check your inbox" |
| `can-request` (logged in, no request) | "Request to Join" button → POST `/api/join-request` → transitions to `pending` |

Outside-click handler closes the email dropdown.

**`app/api/request-access/route.js`** — New public API route:
- Accepts `{ email, campaignSlug, campaignId, campaignName }`
- Uses `createAdminClient()` (service role, bypasses RLS) to find an active non-revoked, non-expired invite code from `campaign_invite_codes`
- Builds `inviteLink = ${APP_URL}/join/${code}` (falls back to `${APP_URL}/register` if no active code)
- Sends campaign-specific onboarding email via Resend with registration link + invite link
- No auth check — fully public endpoint

---

### 6. Faction + territory detail pages made public

**`app/c/[slug]/faction/[id]/page.js`** — Removed `if (!user) redirect('/login')` guard and `redirect` import. Unauthenticated visitors can view faction detail pages. `isOrganiser` defaults to `false`.

**`app/c/[slug]/territory/[id]/page.js`** — Same change: removed auth redirect.

These pages already had public-friendly RLS on their core data tables.

---

### 7. SQL migration — bulletin public read

**`BattleSphere Cowork Project/migration_bulletin_public_read.sql`** — Must be run manually in the Supabase SQL editor:

```sql
create policy "Public can view bulletins"
  on bulletin_dispatches for select
  using (true);
```

Until this is run, the BulletinPanel on the public campaign page will show an empty/placeholder state.

---

## Pending tasks (in priority order)

1. **Run SQL migration** — Execute `migration_bulletin_public_read.sql` in Supabase to enable bulletin display on public pages
2. **Influence Tier 1** — selectable influence modes per campaign
3. **Influence Tier 2** — event-linked mission bonuses (needs `mission_type` field on battle log)
4. **Influence Tier 3** — cascade influence via warp routes

---

## Standard project rules (always apply)
- All files `.js` only — never `.tsx` or TypeScript syntax
- Always use `select('*')` for Supabase queries
- Avoid `.maybeSingle()` — use `.limit(1)` and `?.[0] ?? null` instead
- Event handlers must be in `'use client'` components
- Campaign roles: `'player'`, `'organiser'`, `'admin'` (lowercase); legacy `'Organiser'` (capital O) also exists in some DB rows — check for both
- Faction detail URL: `/c/[slug]/faction/[id]` (singular) — not `/factions/[id]`
- Git remote has GitHub token embedded — `git push` works directly from terminal
- If `git commit` fails with HEAD.lock: request Cowork file delete permission, then `rm -f .git/HEAD.lock`
- Step components in Create Campaign wizard must be called as functions `Step1()` not `<Step1 />`
- `createAdminClient()` (service role) is required for any server-side operation that needs to bypass RLS (e.g. reading invite codes for unauthenticated users)
- The BattleSphere code folder is at `/Users/benjamingrunwald/Desktop/BattleSphere` — must be mounted separately from the "BattleSphere Cowork Project" outputs folder
