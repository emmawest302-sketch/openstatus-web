// Meta / Instagram Graph API helpers. Server-side only: several of these
// use META_APP_SECRET, which must never reach the browser.

const GRAPH = 'https://graph.facebook.com/v21.0';

export const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID ?? '';

// Reading a business's own posts needs the page + instagram scopes below.
// Deliberately minimal: no publishing, messaging, ads or insights.
export const META_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'instagram_basic',
  'business_management',
].join(',');

export function getRedirectUri(): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://openstatus-web-nu.vercel.app';
  return base.replace(/\/$/, '') + '/api/auth/meta/callback';
}

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: META_APP_ID,
    redirect_uri: getRedirectUri(),
    state,
    scope: META_SCOPES,
    response_type: 'code',
  });
  return 'https://www.facebook.com/v21.0/dialog/oauth?' + params.toString();
}

type TokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

// Swap the one-time code for a short-lived user token.
export async function exchangeCodeForToken(code: string): Promise<TokenResponse> {
  const params = new URLSearchParams({
    client_id: META_APP_ID,
    client_secret: process.env.META_APP_SECRET ?? '',
    redirect_uri: getRedirectUri(),
    code,
  });

  const res = await fetch(GRAPH + '/oauth/access_token?' + params.toString());
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? 'Token exchange failed');
  }
  return body as TokenResponse;
}

// Short-lived tokens last about an hour. Trade up for a ~60 day token so
// the nightly poller keeps working without the owner re-authorising.
export async function exchangeForLongLivedToken(
  shortToken: string
): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: META_APP_ID,
    client_secret: process.env.META_APP_SECRET ?? '',
    fb_exchange_token: shortToken,
  });

  const res = await fetch(GRAPH + '/oauth/access_token?' + params.toString());
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? 'Long-lived exchange failed');
  }
  return body as TokenResponse;
}

export type InstagramAccount = {
  igUserId: string;
  username: string;
  pageId: string;
  pageName: string;
  pageAccessToken: string;
};

// An Instagram business account is always reached through the Facebook Page
// it is linked to. No linked Page means nothing we can read, which is why
// personal Instagram accounts cannot work here at all.
export async function findInstagramAccount(
  userToken: string
): Promise<InstagramAccount | null> {
  const url =
    GRAPH +
    '/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}' +
    '&access_token=' +
    encodeURIComponent(userToken);

  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? 'Could not list pages');
  }

  const pages: Array<{
    id: string;
    name?: string;
    access_token?: string;
    instagram_business_account?: { id: string; username?: string };
  }> = body.data ?? [];
  const withIg = pages.find((p) => p.instagram_business_account?.id);
  const instagramAccount = withIg?.instagram_business_account;
  if (!withIg || !instagramAccount) return null;

  return {
    igUserId: instagramAccount.id,
    username: instagramAccount.username ?? '',
    pageId: withIg.id,
    pageName: withIg.name ?? '',
    pageAccessToken: withIg.access_token ?? userToken,
  };
}

export type IgPost = {
  id: string;
  caption: string;
  permalink: string;
  timestamp: string;
};

export async function fetchRecentPosts(
  igUserId: string,
  token: string,
  limit = 25
): Promise<IgPost[]> {
  const url =
    GRAPH +
    '/' +
    igUserId +
    '/media?fields=id,caption,permalink,timestamp&limit=' +
    limit +
    '&access_token=' +
    encodeURIComponent(token);

  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? 'Could not fetch media');
  }

  const media: Array<{
    id: string;
    caption?: string;
    permalink?: string;
    timestamp: string;
  }> = body.data ?? [];

  return media.map((m) => ({
    id: m.id,
    caption: m.caption ?? '',
    permalink: m.permalink ?? '',
    timestamp: m.timestamp,
  }));
}
