-- status_updates.kind — widen the check constraint to the values the app writes.
--
-- Why this exists
-- ---------------
-- The app files an owner's update under one of three kinds:
--
--   'closed'  closed for the rest of today
--   'hours'   today has its own window — closing early, opening late, or both
--   'other'   a plain note
--
-- 'hours' was introduced when an early close stopped being filed as 'closed'
-- (filing it as 'closed' made the public page tell customers a shop that was
-- open until 3pm was shut). The code changed; the constraint never did. So
-- every "closing early" and every "different hours today" has been failing at
-- the database with:
--
--   new row for relation "status_updates" violates check constraint
--   "status_updates_kind_check"
--
-- Safe to run more than once. It does not touch any existing rows, and it
-- only ever widens what is allowed — nothing that fits the old constraint
-- stops fitting this one.

begin;

alter table public.status_updates
  drop constraint if exists status_updates_kind_check;

alter table public.status_updates
  add constraint status_updates_kind_check
  check (kind in ('closed', 'hours', 'other'));

commit;

-- Check it took:
--   select conname, pg_get_constraintdef(oid)
--   from pg_constraint
--   where conrelid = 'public.status_updates'::regclass and contype = 'c';
