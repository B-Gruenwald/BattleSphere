-- Add unit_size to crusade_unit_records.
-- Run this in the Supabase SQL editor.

alter table crusade_unit_records
  add column if not exists unit_size int not null default 0;
