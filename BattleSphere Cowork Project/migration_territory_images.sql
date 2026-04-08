-- Migration: Add image_url column to territories table
-- Run this in the Supabase SQL editor before deploying the territory images feature.

ALTER TABLE territories
  ADD COLUMN IF NOT EXISTS image_url TEXT;
