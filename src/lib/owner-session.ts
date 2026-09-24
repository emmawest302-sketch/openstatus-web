import { getAdminClient } from '@/lib/supabaseAdmin';
import { readOwnerSession, sessionVersionOk, type OwnerSession } from '@/lib/owner-link';

/**
 * Read an owner cookie AND confirm it hasn't been revoked.
 *
 * One function, because the check is only worth anything if nobody forgets it.
 * The signature proves the cookie was issued by us; the version proves it was
 * not issued before the owner last tapped "Get a new link". Both, every time,
 * or a stolen phone keeps working for 400 days.
 *
 * Returns null for "no valid session" in every case — a revoked cookie and a
 * forged one are the same answer, and distinguishing them out loud would tell
 * an attacker which half they got right.
 */
export async function resolveOwnerSession(cookieValue: string | undefined | null): Promise<OwnerSession | null> {
  const session = readOwnerSession(cookieValue);
  if (!session) return null;

  const admin = getAdminClient();
  const { data, error } = await admin
    .from('businesses')
    .select('owner_session_version')
    .eq('id', session.businessId)
    .maybeSingle();

  // A deleted business has no session. A failed query is a different thing:
  // refusing then would lock every owner out of their own shop the moment the
  // database hiccups, so an unreadable column falls back to the default and
  // the signature check still stands on its own.
  if (!error && !data) return null;

  const current = error ? 1 : (data?.owner_session_version as number | null | undefined);
  return sessionVersionOk(session, current) ? session : null;
}
