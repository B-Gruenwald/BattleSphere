-- Migration: Strip Discord #discriminator suffixes from all usernames
-- Discord OAuth stores usernames like "banquetthebarbarian#0".
-- The #0 breaks profile URLs (browsers treat # as a fragment).
-- This strips everything from # onwards for all affected profiles.
-- Safe to run multiple times (WHERE clause limits to rows that still contain #).
-- Run in Supabase SQL editor.

UPDATE public.profiles
SET username = split_part(username, '#', 1)
WHERE username LIKE '%#%';
