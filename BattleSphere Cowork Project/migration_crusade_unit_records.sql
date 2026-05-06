-- Crusade unit tracking: per-unit XP, Kills, CP, Upgrades, Scars within a campaign army.
-- Run this in Supabase SQL editor.

create table if not exists crusade_unit_records (
  id                      uuid primary key default gen_random_uuid(),
  campaign_army_record_id uuid not null references campaign_army_records(id) on delete cascade,
  army_unit_id            uuid not null references army_units(id) on delete cascade,
  player_id               uuid not null references auth.users(id) on delete cascade,
  experience_points       int  not null default 0,
  kills                   int  not null default 0,
  crusade_points          int  not null default 0,
  upgrades                text,
  scars                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  -- Each unit can only appear once per campaign army
  unique(campaign_army_record_id, army_unit_id)
);

create index if not exists idx_crusade_unit_records_car_id
  on crusade_unit_records(campaign_army_record_id);

-- RLS
alter table crusade_unit_records enable row level security;

-- Public read (consistent with campaign_army_records)
create policy "Anyone can read crusade unit records"
  on crusade_unit_records for select
  using (true);

-- Owner can insert
create policy "Player can enlist their own units"
  on crusade_unit_records for insert
  to authenticated
  with check (player_id = auth.uid());

-- Owner can update their own
create policy "Player can update their own unit records"
  on crusade_unit_records for update
  to authenticated
  using (player_id = auth.uid());

-- Owner can delete their own
create policy "Player can remove their own unit records"
  on crusade_unit_records for delete
  to authenticated
  using (player_id = auth.uid());
