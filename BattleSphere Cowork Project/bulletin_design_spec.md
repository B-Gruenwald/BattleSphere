# Campaign Bulletin — Design Spec
**Status:** Design approved (mockup reviewed 2026-04-11). Ready to implement.  
**Mockup file:** `bulletin_mockup.html` (same folder — open in browser to review)

---

## 1. Dashboard Layout (approved)

The Campaign Dashboard (S-09, `app/c/[slug]/page.js`) is restructured as follows, top to bottom:

```
[ Campaign Header: title + Share / Admin buttons ]
─────────────────────────────────────────────────────────
[ HERO ROW — 50/50 grid, fixed height ~390px           ]
│  LEFT: Bulletin Panel (truncated + fade)              │
│  RIGHT: Campaign Map (SVG)                            │
─────────────────────────────────────────────────────────
[ EVENTS STRIP — active/upcoming events, horizontal    ]
─────────────────────────────────────────────────────────
[ STATS BAR — single thin row: Factions · Players …   ]
─────────────────────────────────────────────────────────
[ BOTTOM ROW — 3 columns                               ]
│  Faction Standings │ Player Standings │ Chronicle    │
─────────────────────────────────────────────────────────
```

---

## 2. Hero Row Detail

### 2a. Bulletin Panel (left half)

- **Fixed height** matching the map panel (~390px). Text overflows → hidden, gradient fade at bottom.
- **Header band** (pinned top, no scroll):
  - Act label: `Act II — The Fractured Subsector · Dispatch No. 7` (Cinzel, 0.46rem, gold)
  - Dispatch title: `The Tide Turns at Stiria` (Cinzel bold, 0.82rem)
- **Scroll area** (fills remaining height, overflow:hidden):
  - Bulletin prose text — Crimson Pro, 0.9rem, line-height 1.8
  - Bottom gradient fade: 80px, bg-void colour, covers last line of text
- **Footer bar** (pinned bottom):
  - Left: `Read full dispatch →` button (Cinzel, gold border, opens drawer)
  - Right: `Campaign Week 3 · 09 Apr 2026` (muted metadata)

#### Link styles inside bulletin text
- **Territory names** (Stiria, Salis, Liberta Judex, Anterior Mons):  
  Cinzel font, uppercase, gold colour, underline with `text-underline-offset:3px`, links to `/c/[slug]/territory/[id]`
- **Faction names** (Genestealer Cult, Traitor Astartes, Xenos, governor's Strategi):  
  Italic, text-pri colour, subtle gold bottom-border. Links to `/c/[slug]/factions/[id]`

### 2b. Map Panel (right half)

- Existing `<CampaignMap>` component dropped in here.
- Border between panels: `1px solid var(--border-gold)`
- Entire hero row bordered: `1px solid var(--border-gold)`

---

## 3. "Read Full Dispatch" Drawer

Clicking "Read full dispatch →" slides in a **right-side drawer** (width: min(680px, 92vw)):

- **Sticky header**: act label + dispatch title + ✕ Close button
- **Two-column body**: full bulletin text, both columns, same territory/faction links
- **Footer**: "Issued by the Chronicler · Campaign Week 3 · 09 Apr 2026" + ✎ Edit Bulletin button (organiser only)
- **Previous Dispatches** accordion below footer:
  - Section label: "Previous Dispatches"
  - Each past bulletin: title row (click to expand) → body text
  - Chevron rotates on open
- Closes on: ✕ button / Escape key / clicking the darkened overlay behind it

---

## 4. Events Strip

Below the hero row. Section label: "Active Events".

- `display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))`
- Entire strip bordered: `1px solid rgba(183,140,64,0.20)`
- Cards separated by internal `border-right`
- Each card: status dot + label (green = Active, gold = Upcoming) · event title · 2-line description · meta row (Ends Week X · N Battles · context)
- Data source: existing `campaign_events` table

---

## 5. Stats Bar

Single thin horizontal row. Replaces the previous sidebar column of stats.

- Cells: Factions · Players · Battles · Territories · Active Events · Current Act
- Each cell is a link to the relevant sub-page
- `border: 1px solid var(--border-dim)`, cells divided by `border-right`
- Stat number: Cinzel 1.5rem gold. Label: Cinzel 0.4rem muted.

---

## 6. Bottom Row (Standings + Chronicle)

Three equal columns, `border: 1px solid var(--border-dim)`, divided by `border-right`.

| Faction Standings | Player Standings | Latest Chronicle Entries |
|---|---|---|
| Rank · colour dot · faction name · VP | Rank · colour dot · player name · W/L | Date label · 2–3 line prose entry |

- Data sources: existing tables (factions, campaign_members, battles, campaign_events)
- "Latest Chronicle Entries" = 3 most recent entries from existing Chronicle page

---

## 7. Database — New Table Required

### `bulletin_dispatches`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `campaign_id` | uuid FK → campaigns | |
| `act_label` | text | e.g. "Act II — The Fractured Subsector" |
| `dispatch_number` | int | e.g. 7 |
| `title` | text | e.g. "The Tide Turns at Stiria" |
| `body` | text | Full prose (markdown or plain text) |
| `week_label` | text | e.g. "Campaign Week 3" |
| `issued_at` | timestamptz | |
| `created_by` | uuid FK → profiles | |
| `is_current` | boolean | Only one true per campaign |

- RLS: any campaign member can SELECT; only organisers can INSERT/UPDATE/DELETE
- `is_current = true` identifies the bulletin shown on the dashboard
- Past bulletins (is_current = false) appear in the "Previous Dispatches" accordion

---

## 8. Organiser Editing

- **Edit Bulletin** button appears in the drawer footer (visible to organisers only)
- Clicking opens an inline edit form inside the drawer:
  - Act label (text input)
  - Dispatch number (number input)
  - Title (text input)
  - Body (large textarea — plain text for now, rich text later)
  - Week label (text input)
  - Save / Cancel
- On save: updates the `bulletin_dispatches` row and refreshes the panel
- A separate "New Dispatch" button (organiser, Admin page or drawer) creates a new row and sets `is_current = true`, archiving the previous one

---

## 9. Implementation Order

1. **DB migration**: create `bulletin_dispatches` table + RLS policies
2. **Seed data**: insert one dispatch row for the Austriacus Subsector test campaign
3. **Dashboard layout restructure** (`app/c/[slug]/page.js`):
   - Add hero-row grid wrapper around bulletin panel + `<CampaignMap>`
   - Move stats bar below hero row (horizontal)
   - Move events strip between stats bar and bottom row
   - Add faction/player standings + chronicle preview to bottom row
4. **BulletinPanel component** (`app/components/BulletinPanel.js`):
   - Fetches current bulletin for the campaign
   - Renders truncated text with gradient fade
   - "Read full dispatch" button opens drawer
5. **BulletinDrawer component** (`app/components/BulletinDrawer.js`):
   - Client component ('use client')
   - Props: currentDispatch, previousDispatches, isOrganiser, campaignSlug
   - Slide-in animation, Escape/overlay close
   - Collapsible previous dispatches
   - Edit form (organiser only)
6. **Territory/faction link resolution**: pass territory and faction ID maps from server → bulletin text renderer, replace names with `<Link>` elements
7. **CSS additions** to `globals.css`: hero-row, bulletin-panel, bulletin-fade, bulletin-drawer, events-strip, stats-bar, bottom-row
