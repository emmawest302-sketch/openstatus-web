'use client';

import { supabase } from '@/lib/supabase';

/**
 * Reading and writing the page config from the browser.
 *
 * The config used to live in Supabase Auth user metadata, which rides along in
 * the session JWT cookie on every request. As the config grew that produced
 * 494 REQUEST_HEADER_TOO_LARGE, and the builder still carries cleanup code that
 * strips base64 images on load purely to keep the cookie small enough. It now
 * lives in the business_page_config table, where size doesn't matter.
 *
 * Both functions fall back to the old metadata location, so the app works
 * whether or not supabase_migration_page_config.sql has been run yet. That is
 * deliberate: it means the deploy and the migration don't have to be
 * simultaneous, and either one can happen first.
 */

type SaveResult = { error: { message: string } | null };

/** True when the failure is "that table isn't there yet", not a real error. */
function tableMissing(error: { message?: string; code?: string } | null) {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return error.code === '42P01' || msg.includes('does not exist') || msg.includes('business_page_config');
}

export async function savePageConfig(businessId: string | null | undefined, config: unknown): Promise<SaveResult> {
  if (businessId) {
    const { error } = await supabase
      .from('business_page_config')
      .upsert({ business_id: businessId, config, version: 2 }, { onConflict: 'business_id' });

    if (!error) return { error: null };
    if (!tableMissing(error)) return { error: { message: error.message } };
    // Table not created yet — fall through to the old location rather than
    // losing the owner's save.
  }

  const { error } = await supabase.auth.updateUser({ data: { openstatus_page: config } });
  return { error: error ? { message: error.message } : null };
}

/** Returns the stored config, or null if there isn't one anywhere. */
export async function loadPageConfig(businessId: string | null | undefined): Promise<unknown | null> {
  if (businessId) {
    const { data, error } = await supabase
      .from('business_page_config')
      .select('config')
      .eq('business_id', businessId)
      .maybeSingle();
    if (!error && data?.config) return data.config;
  }

  const { data } = await supabase.auth.getUser();
  return data.user?.user_metadata?.openstatus_page ?? null;
}
