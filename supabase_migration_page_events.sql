-- Migration: create page_events table for analytics
-- Run this in your Supabase SQL Editor for project oveyjwqbnriqhesiutxh

CREATE TABLE IF NOT EXISTS page_events (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id   uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  event_type    text NOT NULL CHECK (event_type IN ('page_view','block_click','directions_click','social_click')),
  block_id      text,
  visitor_id    text,
  path          text,
  referrer      text,
  created_at    timestamptz DEFAULT now() NOT NULL
);

-- Index for efficient per-business queries
CREATE INDEX IF NOT EXISTS page_events_business_id_created_at_idx
  ON page_events (business_id, created_at DESC);

-- Row Level Security: service role only (analytics API uses admin client)
ALTER TABLE page_events ENABLE ROW LEVEL SECURITY;

-- No public read policy — only the service role key (used server-side) can access this table
