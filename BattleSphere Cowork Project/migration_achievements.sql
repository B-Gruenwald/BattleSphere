-- ============================================================
-- Migration: achievements
-- Run this in the Supabase SQL editor before deploying the
-- Achievements feature.
-- ============================================================

create table achievements (
  id                    uuid primary key default gen_random_uuid(),
  campaign_id           uuid not null references campaigns(id) on delete cascade,
  awarded_by            uuid not null references auth.users(id),

  title                 text not null,
  description           text,
  icon                  text not null default '🏆',

  -- Recipient: exactly one of these will be set
  awarded_to_type       text not null, -- 'player' | 'faction'
  awarded_to_player_id  uuid references auth.users(id),
  awarded_to_faction_id uuid references factions(id) on delete cascade,

  created_at            timestamptz default now()
);

-- ── Row Level Security ────────────────────────────────────────

alter table achievements enable row level security;

-- Campaign members can read achievements
create policy "Members can view achievements"
  on achievements for select
  using (public.is_campaign_member(campaign_id));

-- Only the organiser can award achievements
create policy "Organiser can create achievements"
  on achievements for insert
  with check (
    exists (
      select 1 from campaigns
      where id = campaign_id
        and organiser_id = auth.uid()
    )
  );

-- Only the organiser can delete achievements
create policy "Organiser can delete achievements"
  on achievements for delete
  using (
    exists (
      select 1 from campaigns
      where id = campaign_id
        and organiser_id = auth.uid()
    )
  );
