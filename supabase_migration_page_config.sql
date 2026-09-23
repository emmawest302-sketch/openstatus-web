-- ============================================================================
-- Migration: move the OpenStatus page configuration out of Supabase Auth
--            user metadata and into a real table.
--
-- Run this in the Supabase SQL Editor for project oveyjwqbnriqhesiutxh.
-- It is safe to run more than once.
--
-- WHY
-- The page config (blocks, colours, background, socials, weekly hours) has been
-- living in auth.users.raw_user_meta_data. That metadata is packed into the
-- user's JWT, which travels in a cookie on every request — so as the config grew
-- it started producing 494 REQUEST_HEADER_TOO_LARGE on Vercel. The app already
-- carries cleanup code that strips base64 images on load specifically because of
-- this. That is the schema asking to change.
--
-- Auth metadata should hold identity. Product data belongs in a table.
--
-- SAFETY
-- Nothing is deleted. The old metadata stays exactly where it is, and the app
-- reads the new table first and falls back to metadata when there is no row.
-- So you can run this before or after deploying the code, in either order, and
-- a rollback is just redeploying the previous build.
-- ============================================================================

-- 1. The table ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS business_page_config (
  business_id  uuid PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  -- The whole normalized OpenStatusPageConfig object.
  config       jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Lets a future change migrate old shapes deliberately instead of guessing.
  version      integer NOT NULL DEFAULT 2,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE business_page_config IS
  'Customer-facing page configuration. Replaces auth user_metadata.openstatus_page.';

-- Keep updated_at honest without the app having to remember.
CREATE OR REPLACE FUNCTION set_business_page_config_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS business_page_config_updated_at ON business_page_config;
CREATE TRIGGER business_page_config_updated_at
  BEFORE UPDATE ON business_page_config
  FOR EACH ROW EXECUTE FUNCTION set_business_page_config_updated_at();

-- 2. Row level security ------------------------------------------------------
--
-- The builder saves straight from the browser, so the owner needs real INSERT,
-- UPDATE and SELECT rights on their own row. Writing these out explicitly
-- matters: business_hours has SELECT and INSERT but no DELETE policy, and that
-- silent gap is what made a delete-then-insert save fail with a duplicate key
-- and leave pages stuck showing "closed". Do not leave a verb out here.

ALTER TABLE business_page_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner reads own page config"   ON business_page_config;
DROP POLICY IF EXISTS "owner inserts own page config" ON business_page_config;
DROP POLICY IF EXISTS "owner updates own page config" ON business_page_config;
DROP POLICY IF EXISTS "owner deletes own page config" ON business_page_config;

CREATE POLICY "owner reads own page config"
  ON business_page_config FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = business_page_config.business_id AND b.user_id = auth.uid()
  ));

CREATE POLICY "owner inserts own page config"
  ON business_page_config FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = business_page_config.business_id AND b.user_id = auth.uid()
  ));

CREATE POLICY "owner updates own page config"
  ON business_page_config FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = business_page_config.business_id AND b.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = business_page_config.business_id AND b.user_id = auth.uid()
  ));

CREATE POLICY "owner deletes own page config"
  ON business_page_config FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = business_page_config.business_id AND b.user_id = auth.uid()
  ));

-- The public page renders through the service role key, which bypasses RLS,
-- so no anonymous read policy is needed or wanted here.

-- 3. Backfill ----------------------------------------------------------------
-- Copies each business's existing config across. Businesses that already have a
-- row are left alone, so re-running this will not overwrite newer edits.

INSERT INTO business_page_config (business_id, config, version)
SELECT
  b.id,
  COALESCE(u.raw_user_meta_data -> 'openstatus_page', '{}'::jsonb),
  2
FROM businesses b
JOIN auth.users u ON u.id = b.user_id
WHERE u.raw_user_meta_data -> 'openstatus_page' IS NOT NULL
ON CONFLICT (business_id) DO NOTHING;

-- 4. Check your work ---------------------------------------------------------
-- Expect: every business that had a saved page now has a row.

SELECT
  (SELECT count(*) FROM businesses)                                        AS businesses,
  (SELECT count(*) FROM business_page_config)                              AS configs_migrated,
  (SELECT count(*) FROM businesses b JOIN auth.users u ON u.id = b.user_id
     WHERE u.raw_user_meta_data -> 'openstatus_page' IS NOT NULL)          AS configs_in_metadata;

-- NOTE: the old metadata is intentionally NOT cleared here. Once the new build
-- has been live for a few days and pages look right, you can reclaim the cookie
-- space with the statement below. Until then, it is your rollback.
--
--   UPDATE auth.users
--   SET raw_user_meta_data = raw_user_meta_data - 'openstatus_page'
--   WHERE raw_user_meta_data ? 'openstatus_page';
