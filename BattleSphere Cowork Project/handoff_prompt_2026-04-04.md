# BattleSphere — Session Handoff Prompt
Generated 2026-04-04. Paste this at the start of the next Cowork session.

---

## Who I am and how we work
I am Benjamin Grünwald — an enthusiastic Warhammer 40,000 hobbyist with limited coding skills. I am building BattleSphere with AI assistance. I direct the work, test it, and make product decisions. Claude handles all implementation. Explanations should be clear and non-technical where possible. I describe what I want; Claude writes the code and commits it.

## What BattleSphere is
BattleSphere is a system-agnostic narrative wargaming campaign platform. Gaming groups use it to run map-based campaigns and track territorial control, faction influence, battle history, events, achievements, and narrative chronicles. The end goal is to publish it globally and eventually monetise it.

- **Local code:** `/Users/benjamingrunwald/Desktop/BattleSphere`
- **Live site:** https://battle-sphere-topaz.vercel.app
- **GitHub + Vercel are connected** — pushing to `main` auto-deploys
- Three planning documents (uploaded to Cowork 2026-03-27):
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

- All files use `.js` — never `.tsx`, never TypeScript syntax
- Always `select('*')` in Supabase queries — column lists silently fail if a schema column is missing
- Write complete file replacements, not diffs or partial edits, unless told otherwise
- Next.js 16 middleware is named `proxy.js` and exports `proxy`, not `middleware`
- `'use client'` must be at the top of any file using event handlers, useState, useEffect
- Step components in the Create Campaign wizard must be called as functions `Step1()` not `<Step1 />` (avoids focus loss bug)
- RLS circular dependency is broken via a security definer function `public.is_campaign_member()` — don't replace it with inline subqueries
- Git: the remote has a GitHub token embedded; `git push origin main` works directly from the BattleSphere folder without extra auth
- Git index.lock sometimes appears after interrupted operations — fix with `rm -f .git/index.lock` (may need `allow_cowork_file_delete` permission first)
- Supabase RLS silent failure: an UPDATE blocked by RLS returns `{ data: [], error: null }`. Always add `.select()` to update calls and check `saved.length === 0` to surface the error to the user
- **`@` alias maps to project root** — component imports must be `@/app/components/ComponentName`, NOT `@/components/ComponentName`
- Deleting `.next` from Finder (Cmd+Shift+. to show hidden files) is sometimes needed if macOS creates duplicate directories

---

## Database schema (Supabase)

### Tables and key columns

| Table | Key columns |
|---|---|
| `profiles` | id (= auth.users.id), display_name, avatar_url |
| `campaigns` | id, name, slug, organiser_id, setting, description, invite_code |
| `campaign_members` | campaign_id, user_id, faction_id, role |
| `factions` | id, campaign_id, name, colour, description |
| `territories` | id, campaign_id, name, type, description, parent_id, depth, controlling_faction_id, x_pos, y_pos |
| `battles` | id, campaign_id, territory_id, logged_by, attacker_player_id, defender_player_id, attacker_faction_id, defender_faction_id, result, attacker_score, defender_score, chronicle, created_at |
| `territory_influence` | id, territory_id, faction_id, influence_points |
| `campaign_events` | id, campaign_id, title, body, created_by, created_at |
| `achievements` | id, campaign_id, title, description, icon, awarded_by, awarded_to_type ('player'\|'faction'), awarded_to_player_id, awarded_to_faction_id, created_at |

### RLS notes
- All tables have RLS enabled
- Campaign members can read their campaign's data; organisers have broader write access
- RLS circular dependency broken via `public.is_campaign_member(campaign_id)`
- `campaign_members` SELECT policy added 2026-04-04: members can read all members of their campaign

### Pending manual migrations (run in Supabase SQL Editor if not done)
- `BattleSphere Cowork Project/migration_battle_co_ownership.sql` — battle co-ownership RLS
- `BattleSphere Cowork Project/migration_members_select_policy.sql` — allows members to see full player list *(added 2026-04-04)*

---

## What is fully built

### Phase 1 ✓
- Visual design system: dark gothic aesthetic, gold accents, CSS variables
- Landing page, Register, Login, Forgot Password
- Auth-aware nav bar, proxy.js session middleware
- Dashboard (protected route, lists user's campaigns)

### Phase 2 ✓
- Full DB schema with RLS
- Create Campaign wizard (4-step: name/setting → factions → territories → review)
- Campaign Dashboard: live stats, faction standings, Recent Chronicle panel (see Phase 3)
- Interactive SVG campaign map: node-based, hover tooltips, click to navigate
- Territory Detail: controlling faction, sub-territories, battle history
- Battle Log form: player/faction selection, territory, result, scores, chronicle
- Battle Detail: attacker/defender cards, result badge, territory link, chronicle
- Faction Standings: W/D/L/Played/Territories table
- Faction Detail: record strip, controlled territories, assigned players, battle history
- Player List: W/D/L/Played per player, faction shown, achievement icons with hover tooltip
- Player Profile: record strip, set-own-faction form (auto-fills on battle log), battle history

### Phase 3 ✓
- **Influence system:** territory_influence table; influence earned/lost per battle; InfluenceOverrideForm for organiser manual adjustments; shown on map tooltips and territory pages
- **Campaign Events:** Events list, Post Event (organiser only), Event Detail, Edit/Delete; Active Events panel on campaign dashboard
- **Campaign Chronicle:** unified timeline of battles + events + achievements grouped by day, colour-coded by type
- **Achievements:** Hall of Honours page (grouped by faction/player), Award Achievement form (8 presets, 16-icon emoji palette, live preview), achievements strip on Player Profile and Faction Detail, organiser revoke button

### Campaign nav
Map · Factions · Players · Battles · Events · Chronicle · Achievements

### Phase 4 — IN PROGRESS (user testing started 2026-04-01)

#### Bug fixes & features completed 2026-04-02 to 2026-04-04:

**Achievements:**
- Fixed `awarded_by` missing from insert payload (caused not-null constraint error)
- Achievements now appear in the Chronicle timeline as a third entry type
- Achievement icons displayed on Player List, with hover tooltip (title) and click→ Hall of Honours
- Campaign Dashboard "Recent Battles" panel replaced with "Recent Chronicle" — shows 5 newest entries across battles, events, and achievements; headline links to Chronicle

**Battle forms (BattleLogForm.js, BattleEditForm.js):**
- Removed "Transfer control of territory" checkbox from both forms
- Improved validation: detects players with no faction assigned, shows actionable message
- BattleEditForm silent save fix: `.select()` + `saved.length === 0` check
- `useRef` guards prevent faction auto-fill from overwriting saved values on mount

**Battle co-ownership:**
- Edit access extended to: attacker, defender, logger, campaign organiser
- Edit button on Battle Detail hidden from everyone else
- SQL migration file: `migration_battle_co_ownership.sql`

**Personal Battle Log (dashboard):**
- Queries `battles` table filtered by `attacker_player_id` or `defender_player_id`
- Shows battles from viewer's perspective: their faction vs opponent, Victory/Draw/Defeat, score, campaign name, date, link

**Map territory visibility:**
- `normalizePositions()` 6-pass pipeline (scale, place nulls, orbit subs, separate nodes, co-move subs, separate siblings)
- `separateNodes()` pre-jitter + zero-direction guard
- `getLabelOffset()` centroid-direction label placement
- `MapEditForm.js`: new territories saved with computed x_pos/y_pos

**Admin / Invites:**
- Generate Invite Link now surfaces errors (was silently failing if migration not run)
- Player List RLS fix: members can now see all players in their campaign (migration_members_select_policy.sql)

### Likely remaining Phase 4 work
- Further UX polish / bugs from user testing
- Public campaign pages (unauthenticated view)
- Invite system — `/join/[code]` page (DB column exists, join page not yet built)
- Mobile responsiveness pass

### Phase 5 (not started)
- Launch & Grow — publishing, onboarding, monetisation

---

## File structure reference (key files)

```
app/
  dashboard/page.js               — Personal dashboard, Personal Battle Log
  c/[slug]/
    page.js                       — Campaign Dashboard (Recent Chronicle panel)
    map/page.js                   — Map page wrapper
    battle/
      new/page.js                 — Log Battle page
      [id]/page.js                — Battle Detail
      [id]/edit/page.js           — Edit Battle (co-owner gated)
    territory/[id]/page.js        — Territory Detail
    faction/[id]/page.js          — Faction Detail
    players/page.js               — Player List (with achievement icons)
    player/[userId]/page.js       — Player Profile
    standings/page.js             — Faction Standings
    events/...                    — Events CRUD
    chronicle/page.js             — Chronicle timeline (battles + events + achievements)
    achievements/...              — Achievements CRUD
  components/
    CampaignMap.js                — SVG map (normalizePositions, separateNodes, getLabelOffset)
    BattleLogForm.js              — Log battle form
    BattleEditForm.js             — Edit battle form (useRef guards, RLS error handling)
    MapEditForm.js                — Edit map / add territories
    InfluenceOverrideForm.js      — Organiser influence adjustment
    AchievementForm.js            — Award achievement form
    PlayerAchievementIcons.js     — Client component: achievement icons on Player List
    AdminPlayerSearch.js          — Player management + invite link generation
  lib/
    supabase/
      client.js                   — Browser Supabase client
      server.js                   — Server Supabase client
proxy.js                          — Next.js middleware (session refresh)
```
