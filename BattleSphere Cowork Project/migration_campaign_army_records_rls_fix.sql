-- Fix campaign_army_records read policy to allow public (unauthenticated) access.
-- Run this in Supabase SQL editor.

drop policy if exists "Authenticated users can read campaign army records" on campaign_army_records;

create policy "Anyone can read campaign army records"
  on campaign_army_records for select
  using (true);
