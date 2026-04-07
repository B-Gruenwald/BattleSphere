-- Migration: Add optional headline column to battles table
-- Run this in the Supabase SQL Editor

ALTER TABLE battles
ADD COLUMN IF NOT EXISTS headline TEXT;
