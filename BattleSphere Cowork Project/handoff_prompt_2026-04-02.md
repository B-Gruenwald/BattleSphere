# BattleSphere — Session Handoff Prompt
_Generated 2026-04-02. Paste this at the start of the next Cowork session._

---

## Who I am and how we work

I am Benjamin Grünwald — an enthusiastic Warhammer 40,000 hobbyist with limited coding skills. I am building BattleSphere with AI assistance. I direct the work, test it, and make product decisions. Claude handles all implementation. Explanations should be clear and non-technical where possible. I describe what I want; Claude writes the code and commits it.

---

## What BattleSphere is

BattleSphere is a **system-agnostic narrative wargaming campaign platform**. Gaming groups use it to run map-based campaigns and track territorial control, faction influence, battle history, events, achievements, and narrative chronicles. The end goal is to publish it globally and eventually monetise it.

- **Local code:** `/Users/benjamingrunwald/Desktop/BattleSphere`
- **Live site:** https://battle-sphere-topaz.vercel.app
- **GitHub + Vercel** are connected — pushing to `main` auto-deploys
- **Three planning documents** (uploaded to Cowork 2026-03-27):
  - Concept Document v2 — full feature vision
  - Project Plan Draft 1.0 — five-phase roadmap
  - Information Architecture Draft 1.0 — every screen (S-01 to S-30+), full data model (D-01 to D-12), user flows

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2 (App Router) |
| UI | React 19, Tailwind CSS v4 |
| Database / Auth | Supabase (PostgreSQL + RLS + Auth) |
| Client library | @supabase/supabase-js, @supabase/ssr |
| Deployment | Vercel (auto-deploy on push to main) |
| Map | SVG (node/network diagram — not geographic tiles) |

---

## Mandatory coding conventions — never deviate from these

- **All files use `.js`** — never `.tsx`, never TypeScript syntax
- **Always `select('*')`** in Supabase queries — column lists silently fail if a schema column is missing
- **Write complete file replacements**, not diffs or partial edits, unless told otherwise
- **Next.js 16 middleware** is named `proxy.js` and exports `proxy`, not `middleware`
- **'use client'** must be at the top of any file using event handlers, useState, useEffect
- **Step components** in the Create Campaign wizard must be called as functions `Step1()` not `<Step1 />` (avoids focus loss bug)
- **RLS circular dependency** is broken via a security definer function `public.is_campaign_member()` — don't replace it with inline subqueries
- **Git:** the remote has a GitHub token embedded; `git push origin main` works directly from the BattleSphere folder without extra auth
- **Git index.lock** sometimes appears after interrupted operations — fix with `rm -f .git/index.lock` (may need `allow_cowork_file_delete` permission first)
- **Supabase RLS silent failure:** an UPDATE blocked by RLS returns `{ data: [], error: null }`. Always add `.select()` to update calls and check `saved.length === 0` to surface the error to the user
- Deleting `.next` from Finder (Cmd+Shift+. to show hidden files) is sometimes needed if macOS creates duplicate directories

---

## Database schema (Supabase)

### Tables and key columns

| Table | Key columns |
|---|---|
| `profiles` | id (= auth.users.id), display_name, avatar_url |
| `campaigns` | id, name, slug, organiser_id, setting, description |
| `campaign_members` | campaign_id, user_id, faction_id, role |
| `factions` | id, campaign_id, name, colour, description |
| `territories` | id, campaign_id, name, type, description, parent_id, depth, controlling_faction_id, x_pos, y_pos |
| `battles` | id, campaign_id, territory_id, logged_by, attacker_player_id, defender_player_id, attacker_faction_id, defender_faction_id, result, attacker_score, defender_score, chronicle, created_at |
| `territory_influence` | id, territory_id, faction_id, influence_points |
| `campaign_events` | id, campaign_id, title, body, created_by, created_at |
| `achievements` | id, campaign_id, recipient_type (faction/player), recipient_id, title, description, icon, awarded_by, awarded_at |

### RLS notes
- All tables have RLS enabled
- Campaign members can read their campaign's data; organisers have broader write access
- **Battle co-ownership policy** (applied 2026-04-02): attacker_player_id, defender_player_id, logged_by, and campaign organiser_id can all UPDATE a battle record. SQL migration file: `BattleSphere Cowork Project/migration_battle_co_ownership.sql` — **must be run manually in the Supabase SQL editor if not already done**

---

## What is fully built

### Phase 1 ✓
- Visual design system: dark gothic aesthetic, gold accents, CSS variables
- Landing page, Register, Login, Forgot Password
- Auth-aware nav bar, proxy.js session middleware
- Dashboard (protected route, lists user's campaigns)

### Phase 2 ✓
- Full DB schema with RLS (see above)
- Create Campaign wizard (4-step: name/setting → factions → territories → review)
- Campaign Dashboard: live stats, faction standings, recent battles panel
- Interactive SVG campaign map: node-based, hover tooltips, click to navigate
- Territory Detail: controlling faction, sub-territories, battle history
- Battle Log form: player/faction selection, territory, result, scores, chronicle
- Battle Detail: attacker/defender cards, result badge, territory link, chronicle
- Faction Standings: W/D/L/Played/Territories table
- Faction Detail: record strip, controlled territories, assigned players, battle history
- Player List: W/D/L/Played per player, faction shown
- Player Profile: record strip, set-own-faction form (auto-fills on battle log), battle history

### Phase 3 ✓
- **Influence system**: territory_influence table; influence earned/lost per battle; InfluenceOverrideForm for organiser manual adjustments; influence shown on map tooltips and territory pages
- **Campaign Events**: Events list, Post Event (organiser only), Event Detail, Edit/Delete; Active Events panel on campaign dashboard
- **Campaign Chronicle**: unified timeline of battles + events grouped by day, colour-coded by type
- **Achievements**: Hall of Honours page (grouped by faction/player), Award Achievement form (8 presets, 16-icon emoji palette, live preview), achievements strip on Player Profile and Faction Detail, organiser revoke button

### Campaign nav
Map · Factions · Players · Battles · Events · Chronicle · Achievements

---

## Phase 4 — IN PROGRESS (user testing started 2026-04-01)

### Bug fixes completed 2026-04-02

**Battle forms (BattleLogForm.js, BattleEditForm.js):**
- Removed "Transfer control of territory" checkbox entirely from both forms
- Improved validation: detects when a selected player has no faction assigned; shows specific message directing them to their Player Profile
- BattleEditForm silent save fix: `.select()` added to update call; `saved.length === 0` check surfaces RLS failures as a user-visible error
- `useRef` guards (`attackerEffectRan`, `defenderEffectRan`) prevent faction auto-fill from overwriting saved values on mount

**Battle co-ownership (`/c/[slug]/battle/[id]/edit/page.js`, `page.js`, SQL):**
- Edit access extended to: the player who logged the battle, the attacker, the defender, and the campaign organiser
- Edit button on Battle Detail page hidden from everyone else
- Error message: "only the attacker, defender, the player who logged the battle, or the campaign organiser can edit this record"
- ⚠️ SQL migration file must be run in Supabase if not already done

**Personal Battle Log (`app/dashboard/page.js`):**
- Now queries the `battles` table filtered by `attacker_player_id` or `defender_player_id` — shows every campaign battle the logged-in user participated in
- Renders from the viewer's perspective: their faction vs opponent, Victory/Draw/Defeat, score from their viewpoint, campaign name, date, link
- "+ Log Battle" button removed from dashboard header

**Map territory visibility (CampaignMap.js, MapEditForm.js):**
- `normalizePositions()` runs a 6-pass pipeline:
  1. Scale/centre all DB-positioned territories (scale down only, never inflate)
  2. Null top-level territories placed near centre with a per-index offset
  3. Null sub-territories placed in orbit around their parent (9/7 unit radius)
  4. Force-separate top-level nodes (minDist = 12 SVG units, ~150 iterations)
  5. Co-move sub-territories by the same delta as their parent
  6. Force-separate sibling sub-territories (minDist = 5)
- `separateNodes()`: pre-jitters each node by index×0.05/0.03 to prevent zero-direction push; explicit guard for dist < 0.0001 defaults to horizontal push
- `getLabelOffset()`: finds centroid direction from parent toward its subs, places label in the opposite direction; skips subs within 0.5 units of parent; falls back to "directly below" if direction is ambiguous
- `MapEditForm.js`: new territories now saved with computed x_pos/y_pos (circle orbit for roots, sibling orbit for subs) instead of null

### Likely remaining Phase 4 work
- Further UX polish / bugs from user testing
- Public campaign pages (unauthenticated view)
- Invite system (join campaign via link or code)
- Mobile responsiveness pass

---

## Phase 5 (not started)
- Launch & Grow — publishing, onboarding, monetisation

---

## File structure reference (key files)

```
app/
  dashboard/page.js               — Personal dashboard, Personal Battle Log
  c/[slug]/
    page.js                       — Campaign Dashboard
    map/page.js                   — Map page wrapper
    battle/
      new/page.js                 — Log Battle page
      [id]/page.js                — Battle Detail
      [id]/edit/page.js           — Edit Battle (co-owner gated)
    territory/[id]/page.js        — Territory Detail
    faction/[id]/page.js          — Faction Detail
    players/page.js               — Player List
    player/[userId]/page.js       — Player Profile
    standings/page.js             — Faction Standings
    events/...                    — Events CRUD
    chronicle/page.js             — Chronicle timeline
    achievements/...              — Achievements CRUD
  components/
    CampaignMap.js                — SVG map (normalizePositions, separateNodes, getLabelOffset)
    BattleLogForm.js              — Log battle form
    BattleEditForm.js             — Edit battle form (useRef guards, RLS error handling)
    MapEditForm.js                — Edit map / add territories
    InfluenceOverrideForm.js      — Organiser influence adjustment
    AchievementForm.js            — Award achievement form
  lib/
    supabase/
      client.js                   — Browser Supabase client
      server.js                   — Server Supabase client
proxy.js                          — Next.js middleware (session refresh)
```

---

## Pending action requiring manual step

**Run the battle co-ownership SQL migration in Supabase** (if not already done):
File: `BattleSphere Cowork Project/migration_battle_co_ownership.sql`
Go to Supabase → SQL Editor → paste and run the file contents.
