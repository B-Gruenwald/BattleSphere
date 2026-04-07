-- Reset ALL territory influence points to 0 across all campaigns.
-- Run this in the Supabase SQL Editor.
-- This bypasses RLS and takes effect immediately.

UPDATE territory_influence
SET influence_points = 0;
