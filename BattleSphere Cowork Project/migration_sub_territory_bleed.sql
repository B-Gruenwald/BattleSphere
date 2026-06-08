-- Migration: Add sub_territory_bleed flag to campaign_events
-- Run in Supabase SQL editor

ALTER TABLE public.campaign_events ADD COLUMN IF NOT EXISTS sub_territory_bleed BOOLEAN DEFAULT false;

GRANT SELECT ON public.campaign_events TO anon;
GRANT ALL   ON public.campaign_events TO authenticated;
GRANT ALL   ON public.campaign_events TO service_role;
