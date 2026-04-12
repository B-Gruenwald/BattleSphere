# BattleSphere — Session Handoff
**Date:** 2026-04-11  
**Project:** BattleSphere — https://www.battlesphere.cc  
**Local code:** `/Users/benjamingrunwald/Desktop/BattleSphere`  
**Stack:** Next.js 16.2, React 19, Tailwind CSS v4, Supabase, Vercel (auto-deploy on push)  
**Rules:** All files `.js` only (no TypeScript). Use `select('*')` for Supabase. Event handlers must be in `'use client'` components.

---

## What was built this session

### Campaign Bulletin system — now LIVE

The Campaign Bulletin feature is fully built and live at the main campaign dashboard (`app/c/[slug]/page.js`). The old dashboard layout has been replaced.

#### New files created
| File | Type | Purpose |
|---|---|---|
| `app/components/BulletinPanel.js` | Server component | Fetches current dispatch, renders truncated panel with gradient fade |
| `app/components/BulletinDrawer.js` | `'use client'` | Slide-in drawer: full text, previous dispatches accordion, edit/create form |
| `app/components/EventCardBody.js` | `'use client'` | Event body text with 3-line clamp + "Show full event →" expand toggle |
| `app/lib/bulletinText.js` | Shared utility | Renders bulletin body text with headings, auto-links, and manual `[[Target|alias]]` links |

#### Dashboard layout (new, now live)
Top to bottom on `app/c/[slug]/page.js`:
1. Campaign header (title + Share / Admin buttons)
2. **Hero row** — 50/50 grid, ~390px: Bulletin Panel (left) + Campaign Map (right)
3. **Events strip** — active/upcoming events, 2-column grid, full body text with expand toggle
4. **Stats bar** — thin horizontal row: Factions · Players · Battles · Territories · Active Events · Current Act
5. **Bottom row** — 3 columns: Faction Standings · Player Standings · Latest Chronicle

#### Database
New table `bulletin_dispatches` — migration SQL at `BattleSphere Cowork Project/bulletin_migration.sql`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `campaign_id` | uuid FK | |
| `act_label` | text | e.g. "Act II — The Fractured Subsector" |
| `dispatch_number` | int | |
| `title` | text | |
| `body` | text | Plain text, supports `## headings` and link syntax |
| `week_label` | text | e.g. "Campaign Week 3" |
| `issued_at` | timestamptz | |
| `created_by` | uuid FK | |
| `is_current` | boolean | Only one `true` per campaign at a time |

RLS: campaign members can SELECT; organisers can INSERT / UPDATE / DELETE.

---

## Key technical facts — bulletin system

### Bulletin text rendering (`app/lib/bulletinText.js`)
Three things work in the body text:

**1. Section headings** — line starting with `## `:
```
## The Fall of Stiria
```
Renders as a gold Cinzel heading (`.bulletin-section-heading`).

**2. Auto-links** — exact territory or faction name anywhere in the text (case-insensitive):
```
The forces at Stiria were overwhelmed.
```
"Stiria" becomes a link to the territory detail page automatically.

**3. Manual alias links** — `[[Target|display text]]`:
```
the [[Forces of the Hivemind|Genestealer Cults]] struck at dawn
```
- Target = exact territory or faction name (case-insensitive lookup)
- Display text = what the reader sees
- Target is resolved: territories first, then factions
- If target not found → renders as plain text (graceful fallback)
- Pipe character on QWERTZ keyboard: **AltGr + <**

### URLs (important — easy to get wrong)
- Territory detail: `/c/[slug]/territory/[id]` ✓
- Faction detail: `/c/[slug]/faction/[id]` ✓ ← singular, NOT `/factions/[id]`
- Faction list: `/c/[slug]/factions` ✓

### BulletinDrawer behaviour
- Opens automatically in edit mode when no dispatch exists yet
- Save: **INSERT** when no dispatch exists, **UPDATE** when one does (checked via `liveDispatch?.id`)
- Edit button visible to organisers at all times in the drawer footer
- Cancel with no dispatch → closes the drawer
- Escape key / overlay click → closes drawer

### Event cards
- `campaign_events` body column is `body` (NOT `description`)
- Events grid: `minmax(440px, 1fr)` → ~2 columns at desktop
- `EventCardBody` clamps at 3 lines, measures `scrollHeight vs clientHeight` to decide whether to show expand button

### CSS classes added to `globals.css`
`hero-row`, `hero-map-wrap`, `bulletin-panel`, `bulletin-top`, `bulletin-act-label`, `bulletin-title`, `bulletin-scroll`, `bulletin-prose`, `bulletin-fade`, `bulletin-footer`, `read-more-btn`, `bulletin-meta`, `bulletin-territory-link`, `bulletin-faction-link`, `bulletin-section-heading`, `drawer-overlay`, `bulletin-drawer`, `drawer-header`, `drawer-act-label`, `drawer-title`, `drawer-close`, `drawer-body`, `drawer-text-cols`, `drawer-footer`, `drawer-footer-meta`, `drawer-previous`, `drawer-previous-label`, `accordion-item`, `accordion-trigger`, `accordion-dispatch-num`, `accordion-title`, `accordion-chevron`, `accordion-body`, `accordion-meta`, `accordion-text`, `bulletin-edit-form`, `edit-field-row`, `edit-field`, `edit-field--narrow`, `edit-hint`, `edit-hint-block`, `edit-hint-example`, `edit-link-helper`, `edit-link-helper-title`, `edit-link-helper-desc`, `edit-link-group`, `edit-link-group-label`, `edit-link-chips`, `edit-chip`, `edit-chip--territory`, `edit-chip--faction`, `events-strip`, `strip-label`, `events-grid`, `event-card`, `event-card-status`, `event-dot`, `event-card-title`, `event-card-desc`, `event-expand-btn`, `event-card-meta`, `stats-bar`, `stat-cell`, `stat-value`, `stat-label`, `bottom-row`, `standings-col`, `standings-col-header`, `standings-col-title`

---

## Remaining planned tasks (in priority order)

1. **Onboarding email** — welcome email for new test users via Resend
2. **Mobile responsiveness pass** — bulletin hero row stacks on mobile (CSS already has basic breakpoints at 900px, but needs review on real devices)
3. **New Dispatch flow** — currently editing overwrites the current dispatch. A "Publish New Dispatch" button should archive the old one (`is_current = false`) and insert a fresh one (`is_current = true`)
4. **Influence Tier 1** — selectable influence modes per campaign
5. **Influence Tier 2** — event-linked mission bonuses
6. **Influence Tier 3** — cascade influence via warp routes

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
