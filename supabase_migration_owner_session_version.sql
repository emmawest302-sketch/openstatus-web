-- businesses.owner_session_version — makes "Get a new link" actually revoke.
--
-- Why this exists
-- ---------------
-- The owner link works in two steps: a one-time token at /s/<token> is swapped
-- for a signed cookie that lasts 400 days. Rotating the token replaced the
-- link, but every phone that had ALREADY swapped it kept its cookie and full
-- access — while the UI said "the old one stops working on every phone".
--
-- That is worse than having no button at all: an owner whose phone was stolen
-- would tap it, believe they were safe, and stop worrying.
--
-- Every cookie now carries the version it was issued under. Rotating bumps
-- this number, and any cookie below it is refused on its next request.
--
-- Starting at 1 matches how existing cookies are read, so nobody is signed out
-- by running this. The first rotation moves them to 2 and revokes them.
--
-- Safe to run more than once.

alter table public.businesses
  add column if not exists owner_session_version integer not null default 1;

-- Check it took:
--   select column_name, data_type, column_default
--   from information_schema.columns
--   where table_name = 'businesses' and column_name = 'owner_session_version';
