import { getAdminClient } from '@/lib/supabaseAdmin';

type Post = {
  caption: string | null;
  permalink: string;
  posted_at: string | null;
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function truncate(text: string | null, max = 90): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text;
}

export default async function InstagramUpdatesBlock({ businessId }: { businessId: string }) {
  const admin = getAdminClient();

  // Check if this business has a connected Meta / Instagram account
  const { data: tokenRow } = await admin
    .from('oauth_tokens')
    .select('external_account_id, metadata, expires_at')
    .eq('business_id', businessId)
    .eq('provider', 'meta')
    .maybeSingle();

  // No connection at all — render nothing on the public page
  if (!tokenRow) return null;

  // Token present but expired — still show the block so we don't
  // silently disappear; the nightly sync will refresh or fail gracefully.
  const expired =
    tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date();

  // Pull the cached username out of metadata if available
  const igUsername: string | null =
    (tokenRow.metadata as Record<string, string> | null)?.ig_username ?? null;

  const igProfileUrl = igUsername
    ? `https://www.instagram.com/${igUsername}`
    : 'https://www.instagram.com';

  // Fetch the three most-recent cached posts
  const { data: posts } = await admin
    .from('posts')
    .select('caption, permalink, posted_at')
    .eq('business_id', businessId)
    .order('posted_at', { ascending: false })
    .limit(3);

  const items: Post[] = posts ?? [];

  return (
    <div className="rounded-[26px] bg-white/75 backdrop-blur-xl border border-white/70 overflow-hidden mt-3">
      <div className="flex items-center gap-2.5 px-5 pt-4 pb-3">
        {/* Instagram gradient icon */}
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5"/>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
          </svg>
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#1A1A18]/50">Latest posts</p>
          <p className="text-[15px] font-bold leading-tight text-[#1A1A18]">Instagram updates</p>
        </div>
      </div>

      {items.length === 0 ? (
        /* ── Empty state: connected but no posts synced yet ── */
        <div className="px-5 pb-5">
          <p className="text-[13px] text-[#1A1A18]/40 leading-snug">
            {expired
              ? 'Instagram posts will reappear once the connection is refreshed.'
              : 'Posts will appear here once they sync — usually within a few minutes.'}
          </p>
        </div>
      ) : (
        /* ── Post list ── */
        <ul className="divide-y divide-black/5 px-5 pb-4">
          {items.map((post, i) => (
            <li key={i} className="py-3">
              <a
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3"
              >
                {/* IG gradient dot */}
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-gradient-to-br from-[#ee2a7b] to-[#6228d7]" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-snug text-[#1A1A18] group-hover:text-[#ee2a7b] transition-colors">
                    {truncate(post.caption)}
                  </p>
                  {post.posted_at && (
                    <p className="mt-1 text-[11px] text-[#1A1A18]/40">{timeAgo(post.posted_at)}</p>
                  )}
                </div>
                {/* arrow */}
                <svg className="mt-0.5 shrink-0 text-[#1A1A18]/25 group-hover:text-[#ee2a7b] transition-colors" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7M17 7H7M17 7v10"/>
                </svg>
              </a>
            </li>
          ))}
        </ul>
      )}

      <a
        href={igProfileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block border-t border-black/5 px-5 py-3 text-center text-[11px] font-semibold text-[#ee2a7b] hover:bg-black/2 transition-colors"
      >
        {igUsername ? `@${igUsername} on Instagram` : 'View on Instagram'} →
      </a>
    </div>
  );
}
