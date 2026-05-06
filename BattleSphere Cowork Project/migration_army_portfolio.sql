-- ============================================================
-- Army Portfolio — Phase A
-- Tables: armies, army_units, army_unit_photos
-- Run this in the Supabase SQL editor.
-- ============================================================

-- 1. armies (player-level, not campaign-scoped)
create table if not exists armies (
  id              uuid primary key default gen_random_uuid(),
  player_id       uuid not null references profiles(id) on delete cascade,
  name            text not null,
  game_system     text,
  faction_name    text,
  tagline         text,
  backstory       text,
  cover_image_url text,
  is_public       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 2. army_units (belong to an army)
create table if not exists army_units (
  id          uuid primary key default gen_random_uuid(),
  army_id     uuid not null references armies(id) on delete cascade,
  name        text not null,
  unit_type   text,
  description text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- 3. army_unit_photos (Cloudinary URLs per unit)
create table if not exists army_unit_photos (
  id          uuid primary key default gen_random_uuid(),
  unit_id     uuid not null references army_units(id) on delete cascade,
  uploader_id uuid not null references profiles(id) on delete cascade,
  url         text not null,
  caption     text,
  created_at  timestamptz not null default now()
);

-- ── RLS ──────────────────────────────────────────────────────

alter table armies           enable row level security;
alter table army_units       enable row level security;
alter table army_unit_photos enable row level security;

-- armies: public can read armies that are marked public
create policy "Public can read public armies"
  on armies for select
  using (is_public = true);

-- armies: owner can always read their own (e.g. drafts)
create policy "Owner can read own armies"
  on armies for select
  using (player_id = auth.uid());

-- armies: owner can create
create policy "Owner can insert armies"
  on armies for insert
  with check (player_id = auth.uid());

-- armies: owner can update
create policy "Owner can update armies"
  on armies for update
  using (player_id = auth.uid());

-- armies: owner can delete (cascades to units + photos)
create policy "Owner can delete armies"
  on armies for delete
  using (player_id = auth.uid());

-- army_units: anyone can read (visibility controlled at army level in server code)
create policy "Public can read army units"
  on army_units for select
  using (true);

-- army_units: owner of the parent army can insert
create policy "Army owner can insert units"
  on army_units for insert
  with check (
    exists (
      select 1 from armies where armies.id = army_id and armies.player_id = auth.uid()
    )
  );

-- army_units: owner of the parent army can update
create policy "Army owner can update units"
  on army_units for update
  using (
    exists (
      select 1 from armies where armies.id = army_id and armies.player_id = auth.uid()
    )
  );

-- army_units: owner of the parent army can delete
create policy "Army owner can delete units"
  on army_units for delete
  using (
    exists (
      select 1 from armies where armies.id = army_id and armies.player_id = auth.uid()
    )
  );

-- army_unit_photos: anyone can read
create policy "Public can read unit photos"
  on army_unit_photos for select
  using (true);

-- army_unit_photos: authenticated user can insert their own
create policy "Authenticated can insert unit photos"
  on army_unit_photos for insert
  with check (uploader_id = auth.uid());

-- army_unit_photos: uploader or army owner can delete
create policy "Uploader can delete unit photos"
  on army_unit_photos for delete
  using (uploader_id = auth.uid());
