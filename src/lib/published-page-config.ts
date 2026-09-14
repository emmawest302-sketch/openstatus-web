import { getAdminClient } from '@/lib/supabaseAdmin';
import { normalizeOpenStatusPageConfig } from '@/lib/openstatus-page-config';

export async function loadPublishedPageConfig(userId: string) {
  const admin = getAdminClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  return normalizeOpenStatusPageConfig(data.user?.user_metadata?.openstatus_page);
}
