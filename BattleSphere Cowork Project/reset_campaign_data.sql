-- ============================================================
-- Clean-slate reset — deletes ALL campaign data
-- Safe to run: user profiles and auth accounts are NOT touched.
-- Schema (tables, RLS policies, functions) is NOT touched.
-- ============================================================
-- Run this in: Supabase dashboard → SQL Editor → New query → Run
-- ============================================================

-- 1. Leaf tables first (referencing campaigns/factions/territories)
delete from achievements;
delete from campaign_events;
delete from territory_influence;
delete from battles;

-- 2. Mid-level tables
delete from campaign_members;
delete from territories;
delete from factions;

-- 3. Root table — cascades to anything remaining
delete from campaigns;

-- Confirm row counts (should all be 0)
select
  (select count(*) from campaigns)          as campaigns,
  (select count(*) from factions)           as factions,
  (select count(*) from territories)        as territories,
  (select count(*) from campaign_members)   as campaign_members,
  (select count(*) from battles)            as battles,
  (select count(*) from campaign_events)    as campaign_events,
  (select count(*) from territory_influence) as territory_influence,
  (select count(*) from achievements)       as achievements;
