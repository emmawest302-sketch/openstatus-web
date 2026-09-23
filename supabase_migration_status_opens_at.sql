-- ============================================================================
-- Migration: status_updates.opens_at
-- Run in the Supabase SQL Editor for project oveyjwqbnriqhesiutxh.
-- Safe to run more than once.
--
-- WHY
-- The "different hours today" control sends both an opening and a closing time.
-- Only closes_at had somewhere to live, so the opening time survived in the
-- headline text and in the Google special-hours push, but not as data.
--
-- The public page therefore took the closing time from the override and the
-- OPENING time from the regular weekly schedule. A shop whose normal hours are
-- 09:00-17:00, set to 12:00-16:00 for today, would be reported as open at
-- 10:00 — an hour and a half before it unlocked the door.
-- ============================================================================

ALTER TABLE status_updates
  ADD COLUMN IF NOT EXISTS opens_at time;

COMMENT ON COLUMN status_updates.opens_at IS
  'Opening time for a today-only hours override. NULL means "use the regular schedule".';

-- Check: expect opens_at to appear alongside closes_at.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'status_updates' AND column_name IN ('opens_at','closes_at')
ORDER BY column_name;
