-- Migration: add phone, website, address, category columns to businesses
-- Run this in your Supabase SQL editor for project oveyjwqbnriqhesiutxh

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS phone   text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS category text;
