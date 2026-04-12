# Session Handoff — Campaign Bulletin Feature
**For:** Monday session (approx. 2026-04-14)  
**Project:** BattleSphere — https://www.battlesphere.cc  
**Local code:** `/Users/benjamingrunwald/Desktop/BattleSphere`  
**Stack:** Next.js 16.2, React 19, Tailwind CSS v4, Supabase, Vercel (auto-deploy on push)  
**Rules:** All files `.js` only (no TypeScript). Use `select('*')` for Supabase. Event handlers must be in `'use client'` components.

---

## What we're building this session

The **Campaign Bulletin** feature — a narrative dispatch system for campaign organisers to publish story updates on the campaign dashboard.

The design was finalized and approved on 2026-04-11. Full design spec is at:
> `BattleSphere Cowork Project/bulletin_design_spec.md`

The interactive HTML mockup (open in browser to review the design) is at:
> `BattleSphere Cowork Project/bulletin_mockup.html`

---

## Approved Dashboard Layout (summary)

Top to bottom on the Campaign Dashboard (`app/c/[slug]/page.js`):

1. **Campaign header** (title + Share / Admin buttons) — already exists
2. **Hero row** — 50/50 grid, ~390px tall:
   - LEFT: Bulletin Panel (text truncated with gradient fade, "Read full dispatch →" button)
   - RIGHT: Campaign Map (existing `<CampaignMap>` component)
3. **Active Events strip** — horizontal grid of event cards (existing data)
4. **Stats bar** — thin single row: Factions · Players · Battles · Territories · Active Events · Current Act
5. **Bottom row** — 3 columns: Faction Standings · Player Standings · Latest Chronicle Entries

The "Read full dispatch →" button opens a **slide-in drawer** (right side) with the full bulletin text in two columns, collapsible previous dispatches accordion, and an Edit button for organisers.

---

## New database table needed

```sql
create table bulletin_dispatches (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  act_label text,
  dispatch_number int,
  title text,
  body text,
  week_label text,
  issued_at timestamptz default now(),
  created_by uuid references profiles(id),
  is_current boolean default false
);

-- RLS
alter table bulletin_dispatches enable row level security;

-- Anyone who can view the campaign can read bulletins
create policy "Members can view bulletins"
  on bulletin_dispatches for select
  using (
    exists (
      select 1 from campaign_members
      where campaign_members.campaign_id = bulletin_dispatches.campaign_id
        and campaign_members.user_id = auth.uid()
    )
  );

-- Only organisers can write
create policy "Organisers can manage bulletins"
  on bulletin_dispatches for all
  using (
    exists (
      select 1 from campaign_members
      where campaign_members.campaign_id = bulletin_dispatches.campaign_id
        and campaign_members.user_id = auth.uid()
        and campaign_members.role in ('organiser', 'admin', 'Organiser')
    )
  );
```

After creating the table, seed one test dispatch for the Austriacus Subsector campaign.

---

## New components to create

| File | Type | Purpose |
|---|---|---|
| `app/components/BulletinPanel.js` | server component | Fetches current dispatch, renders truncated panel with fade |
| `app/components/BulletinDrawer.js` | `'use client'` | Slide-in drawer with full text, accordion, edit form |

---

## Key CSS classes to add to `globals.css`

`hero-row`, `bulletin-panel`, `bulletin-top`, `bulletin-scroll`, `bulletin-fade`, `bulletin-read-more`, `read-more-btn`, `bulletin-drawer`, `drawer-overlay`, `events-strip`, `events-grid`, `event-card`, `stats-bar`, `stat-cell`, `bottom-row`, `standings-col`, `chronicle-entry`

See `bulletin_mockup.html` for exact styling reference.

---

## Link behaviour in bulletin text

Territory names and faction names in the bulletin body are clickable:
- **Territory names** → `/c/[slug]/territory/[territory-id]` — styled Cinzel uppercase gold with underline
- **Faction names** → `/c/[slug]/factions/[faction-id]` — styled italic, subtle gold underline on hover

The bulletin `body` column stores plain text. A text-renderer function replaces known territory/faction names with `<Link>` components using ID maps fetched server-side.

---

## Session start checklist

- [ ] Read `bulletin_design_spec.md` for full detail
- [ ] Open `bulletin_mockup.html` in browser to review the approved design
- [ ] Run Supabase migration to create `bulletin_dispatches` table
- [ ] Seed test dispatch for Austriacus Subsector
- [ ] Restructure `app/c/[slug]/page.js` layout
- [ ] Build `BulletinPanel.js` and `BulletinDrawer.js`
- [ ] Add CSS to `globals.css`
- [ ] Wire up territory/faction links
- [ ] Test on Vercel (auto-deploys on git push)
