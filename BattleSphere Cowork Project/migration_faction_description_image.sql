-- Migration: Add description and image_url to factions table
-- Run in Supabase SQL editor

ALTER TABLE public.factions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.factions ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Explicit grants (in line with the established pattern)
GRANT SELECT ON public.factions TO anon;
GRANT ALL   ON public.factions TO authenticated;
GRANT ALL   ON public.factions TO service_role;
