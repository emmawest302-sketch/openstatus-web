import { getAdminClient } from '@/lib/supabaseAdmin';
import { normalizeOpenStatusPageConfig } from '@/lib/openstatus-page-config';

/**
 * Server-side read for the public business page.
 *
 * Prefers the business_page_config table and falls back to the old auth
 * user_metadata location, so pages keep rendering correctly before the
 * migration has been run and for any owner who has not saved since.
 *
 * businessId is optional only so existing callers don't have to change; passing
 * it skips a lookup.
 */
export async function loadPublishedPageConfig(userId: string, businessId?: string) {
  const admin = getAdminClient();

  let id = businessId;
  if (!id) {
    const { data } = await admin
      .from('businesses')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    id = data?.id as string | undefined;
  }

  if (id) {
    const { data, error } = await admin
      .from('business_page_config')
      .select('config')
      .eq('business_id', id)
      .maybeSingle();
    if (!error && data?.config) return normalizeOpenStatusPageConfig(data.config);
  }

  const { data } = await admin.auth.admin.getUserById(userId);
  return normalizeOpenStatusPageConfig(data.user?.user_metadata?.openstatus_page);
}
