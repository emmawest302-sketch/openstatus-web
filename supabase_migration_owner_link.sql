-- ============================================================================
-- Migration: owner links
-- Run in the Supabase SQL Editor for project oveyjwqbnriqhesiutxh.
-- Safe to run more than once.
--
-- WHY
-- A shop owner needs to close early from their phone, and today they cannot.
-- The owner bar on the public page checked for a Supabase session, but an
-- owner reaches their own page by tapping the link in their Instagram bio —
-- which opens inside Instagram's webview, with its own cookie jar and no
-- session. So the controls were invisible in exactly the place they were
-- most needed.
--
-- The owner link is a per-business key. Tapping it once exchanges it for a
-- long-lived signed cookie; the home screen icon then points at /me, which
-- carries no secret. The token stays rotatable so a lost phone is one button
-- to fix rather than a support ticket.
-- ============================================================================

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS owner_token            text,
  ADD COLUMN IF NOT EXISTS owner_token_created_at timestamptz;

-- Two businesses must never share a token. Partial, so the many rows that do
-- not have one yet don't all collide on NULL.
CREATE UNIQUE INDEX IF NOT EXISTS businesses_owner_token_key
  ON businesses (owner_token)
  WHERE owner_token IS NOT NULL;

COMMENT ON COLUMN businesses.owner_token IS
  'Single-use-ish key for the owner link (/s/<token>). Exchanged for a signed '
  'session cookie. Rotate to revoke every device at once.';

-- The token is a credential. It is read and written only through the service
-- role on the server, never from the browser, so no policy grants access to it.
-- Anyone holding it can change the business hours, which is the same trade as
-- a calendar booking link.

-- Check: expect the two columns and the unique index to exist.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'businesses'
  AND column_name IN ('owner_token','owner_token_created_at')
ORDER BY column_name;
