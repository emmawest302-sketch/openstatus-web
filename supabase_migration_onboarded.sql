-- Run this in your Supabase SQL Editor (app project: oveyjwqbnriqhesiutxh)
-- Adds the onboarded_at column to track tutorial completion per account

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;
