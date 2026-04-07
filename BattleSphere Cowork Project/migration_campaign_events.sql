-- ============================================================
-- Migration: campaign_events
-- Run this in the Supabase SQL editor before deploying the
-- Campaign Events feature.
-- ============================================================

create table campaign_events (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references campaigns(id) on delete cascade,
  created_by      uuid not null references auth.users(id),
  title           text not null,
  body            text,
  event_type      text not null default 'narrative',
    -- values: 'narrative' | 'mechanic' | 'special_rule' | 'mission'
  status          text not null default 'active',
    -- values: 'upcoming' | 'active' | 'resolved'
  affected_factions uuid[],
    -- null = affects all factions; array of faction UUIDs otherwise
  starts_at       timestamptz,
  ends_at         timestamptz,
  created_at      timestamptz default now()
);

-- ── Row Level Security ────────────────────────────────────────

alter table campaign_events enable row level security;

-- Campaign members can read events
create policy "Members can view campaign events"
  on campaign_events for select
  using (public.is_campaign_member(campaign_id));

-- Only the campaign organiser can insert events
create policy "Organiser can create events"
  on campaign_events for insert
  with check (
    exists (
      select 1 from campaigns
      where id = campaign_id
        and organiser_id = auth.uid()
    )
  );

-- Only the campaign organiser can update events
create policy "Organiser can update events"
  on campaign_events for update
  using (
    exists (
      select 1 from campaigns
      where id = campaign_id
        and organiser_id = auth.uid()
    )
  );

-- Only the campaign organiser can delete events
create policy "Organiser can delete events"
  on campaign_events for delete
  using (
    exists (
      select 1 from campaigns
      where id = campaign_id
        and organiser_id = auth.uid()
    )
  );
