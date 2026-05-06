-- Army Portfolio Phase B: campaign_army_records
-- Links an army to a specific campaign with Crusade tracking data.
-- Run this in Supabase SQL editor.

create table if not exists campaign_army_records (
  id               uuid primary key default gen_random_uuid(),
  campaign_id      uuid not null references campaigns(id) on delete cascade,
  army_id          uuid not null references armies(id) on delete cascade,
  player_id        uuid not null references auth.users(id) on delete cascade,
  -- Campaign-specific notes
  campaign_notes   text,
  -- Crusade tracking
  crusade_points   int  not null default 0,
  supply_limit     int  not null default 0,
  supply_used      int  not null default 0,
  battles_played   int  not null default 0,
  battles_won      int  not null default 0,
  requisition_points int not null default 0,
  scars_and_upgrades text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- One army can only be linked once per campaign
  unique(campaign_id, army_id)
);

-- Index for fast lookup by campaign + player
create index if not exists idx_campaign_army_records_campaign_player
  on campaign_army_records(campaign_id, player_id);

-- RLS
alter table campaign_army_records enable row level security;

-- Anyone authenticated can read records (army visibility handled in app)
create policy "Authenticated users can read campaign army records"
  on campaign_army_records for select
  to authenticated
  using (true);

-- Player can insert their own records
create policy "Player can link their own army"
  on campaign_army_records for insert
  to authenticated
  with check (player_id = auth.uid());

-- Player can update their own records
create policy "Player can update their own army record"
  on campaign_army_records for update
  to authenticated
  using (player_id = auth.uid());

-- Player can delete (unlink) their own records
create policy "Player can unlink their own army"
  on campaign_army_records for delete
  to authenticated
  using (player_id = auth.uid());
