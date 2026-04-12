-- ============================================================
-- BattleSphere — Newsletter & Campaign Digest system
-- Run in Supabase SQL editor
-- ============================================================

-- ── 1. Add newsletter/digest columns to profiles ─────────────
alter table profiles
  add column if not exists optin_platform_news     boolean default null,
  add column if not exists optin_campaign_digests  boolean default null,
  add column if not exists digest_frequency        text    default null
    check (digest_frequency is null or digest_frequency in ('weekly', 'fortnightly', 'monthly')),
  add column if not exists last_digest_sent_at     timestamptz default null;

-- ── 2. Add per-campaign digest toggle to campaign_members ────
alter table campaign_members
  add column if not exists include_in_digest boolean not null default true;

-- ── 3. Platform announcements queue ──────────────────────────
--    Admin writes items here; they flow into the next digest
--    round for all opted-in users (based on last_digest_sent_at).
create table if not exists platform_announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table platform_announcements enable row level security;

-- Admins can do everything
create policy "Admins manage platform_announcements"
  on platform_announcements
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- ── 4. Campaign digest messages queue ────────────────────────
--    Organiser queues a message; it is included in the next
--    digest for each subscriber (anything with created_at
--    after the subscriber's last_digest_sent_at).
create table if not exists campaign_digest_messages (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  author_id   uuid not null references profiles(id),
  message     text not null,
  created_at  timestamptz not null default now()
);

alter table campaign_digest_messages enable row level security;

-- Organisers (by organiser_id on campaigns OR role in campaign_members) can insert
create policy "Organisers can insert digest messages"
  on campaign_digest_messages for insert
  with check (
    exists (
      select 1 from campaigns
      where id = campaign_id and organiser_id = auth.uid()
    )
    or exists (
      select 1 from campaign_members
      where campaign_id = campaign_digest_messages.campaign_id
        and user_id = auth.uid()
        and role in ('organiser', 'Organiser', 'admin')
    )
  );

-- Organisers can read their own campaign messages
create policy "Organisers can read digest messages"
  on campaign_digest_messages for select
  using (
    exists (
      select 1 from campaigns
      where id = campaign_id and organiser_id = auth.uid()
    )
    or exists (
      select 1 from campaign_members
      where campaign_id = campaign_digest_messages.campaign_id
        and user_id = auth.uid()
        and role in ('organiser', 'Organiser', 'admin')
    )
  );

-- Organisers can delete their own messages (before they go out)
create policy "Organisers can delete digest messages"
  on campaign_digest_messages for delete
  using (author_id = auth.uid());
