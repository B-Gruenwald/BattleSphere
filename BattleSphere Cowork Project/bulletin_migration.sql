-- ═══════════════════════════════════════════════════════════
--  BattleSphere — Campaign Bulletin Dispatches
--  Run this in the Supabase SQL editor for your project.
-- ═══════════════════════════════════════════════════════════

-- 1. Create table
create table bulletin_dispatches (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid references campaigns(id) on delete cascade,
  act_label       text,
  dispatch_number int,
  title           text,
  body            text,
  week_label      text,
  issued_at       timestamptz default now(),
  created_by      uuid references profiles(id),
  is_current      boolean default false
);

-- 2. Enable RLS
alter table bulletin_dispatches enable row level security;

-- 3. Members can read bulletins for campaigns they belong to
create policy "Members can view bulletins"
  on bulletin_dispatches for select
  using (
    exists (
      select 1 from campaign_members
      where campaign_members.campaign_id = bulletin_dispatches.campaign_id
        and campaign_members.user_id = auth.uid()
    )
  );

-- 4. Organisers can insert, update, delete
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

-- ═══════════════════════════════════════════════════════════
--  Seed — one test dispatch for the Austriacus Subsector
--  (finds the campaign by slug so no hardcoded UUIDs needed)
-- ═══════════════════════════════════════════════════════════

insert into bulletin_dispatches
  (campaign_id, act_label, dispatch_number, title, body, week_label, is_current)
select
  c.id,
  'Act II — The Fractured Subsector',
  7,
  'The Tide Turns at Stiria',
  'The void-cold corridors of Stiria have run red with the blood of martyrs and heretics alike. After three weeks of grinding attrition across the manufactorum districts, the defenders have broken — not in rout, but in calculated withdrawal, drawing the pursuers into the tangled warrens of the underhive.

The Genestealer Cult erupts from the shadows with terrifying coordination. Cult ambuscades have severed two supply arteries linking the Anterior Mons relay to the forward positions on Salis. The governor''s Strategi, stretched thin across a dozen contested sub-sectors, are forced to commit their last armoured reserves to hold the ridge line.

Meanwhile, Traitor Astartes warbands press hard upon the flanks. Liberta Judex burns — its agri-domes shattered, its silos emptied or poisoned. Only the defenders of Stiria itself stand firm, buying time with lives for a counter-offensive that has not yet come.

The question now is not whether the subsector will fracture — it is where the final line will be drawn, and who will have the strength to hold it.',
  'Campaign Week 3',
  true
from campaigns c
where c.slug = 'austriacus-subsector'
limit 1;
