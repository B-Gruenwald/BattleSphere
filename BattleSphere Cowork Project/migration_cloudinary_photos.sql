-- Migration: Cloudinary photo galleries for battles and factions
-- Run this in the Supabase SQL editor.

-- ── 1. battle_photos ──────────────────────────────────────────────────────────
-- Stores Cloudinary photo URLs attached to battle reports.
create table if not exists battle_photos (
  id           uuid        primary key default gen_random_uuid(),
  battle_id    uuid        not null references battles(id)     on delete cascade,
  uploader_id  uuid        not null references auth.users(id)  on delete cascade,
  url          text        not null,
  created_at   timestamptz not null default now()
);

-- ── 2. faction_photos ─────────────────────────────────────────────────────────
-- Stores Cloudinary photo URLs for faction army showcases.
create table if not exists faction_photos (
  id           uuid        primary key default gen_random_uuid(),
  faction_id   uuid        not null references factions(id)    on delete cascade,
  uploader_id  uuid        not null references auth.users(id)  on delete cascade,
  url          text        not null,
  created_at   timestamptz not null default now()
);

-- ── 3. RLS ────────────────────────────────────────────────────────────────────
alter table battle_photos  enable row level security;
alter table faction_photos enable row level security;

-- Any authenticated user can read photos
create policy "authenticated read battle_photos"
  on battle_photos for select
  to authenticated
  using (true);

create policy "authenticated read faction_photos"
  on faction_photos for select
  to authenticated
  using (true);

-- Authenticated users can insert their own photos
create policy "authenticated insert battle_photos"
  on battle_photos for insert
  to authenticated
  with check (auth.uid() = uploader_id);

create policy "authenticated insert faction_photos"
  on faction_photos for insert
  to authenticated
  with check (auth.uid() = uploader_id);

-- Uploaders can delete their own photos
-- (wider deletion — e.g. by campaign organisers — is handled server-side
--  via the service-role API route which bypasses RLS)
create policy "uploader delete battle_photos"
  on battle_photos for delete
  to authenticated
  using (auth.uid() = uploader_id);

create policy "uploader delete faction_photos"
  on faction_photos for delete
  to authenticated
  using (auth.uid() = uploader_id);
