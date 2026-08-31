import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';
import { fetchRecentPosts } from '@/lib/meta';

// Pulls the latest Instagram posts for the signed-in user's business and
// stores them. Runs server side so the Meta token never reaches the browser.
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  if (!jwt) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const admin = getAdminClient();

  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData.user) {
    return NextResponse.json({ error: 'Session not valid' }, { status: 401 });
  }

  const { data: business } = await admin
    .from('businesses')
    .select('id')
    .eq('user_id', userData.user.id)
    .single();

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 });
  }

  const { data: token } = await admin
    .from('oauth_tokens')
    .select('access_token, external_account_id, expires_at')
    .eq('business_id', business.id)
    .eq('provider', 'meta')
    .maybeSingle();

  if (!token?.access_token || !token.external_account_id) {
    return NextResponse.json(
      { error: 'Instagram is not connected yet' },
      { status: 400 }
    );
  }

  if (token.expires_at && new Date(token.expires_at) < new Date()) {
    return NextResponse.json(
      { error: 'Instagram access expired. Reconnect the account.' },
      { status: 400 }
    );
  }

  try {
    const posts = await fetchRecentPosts(
      token.external_account_id,
      token.access_token,
      25
    );

    if (posts.length === 0) {
      return NextResponse.json({ fetched: 0, stored: 0 });
    }

    const rows = posts.map((p) => ({
      business_id: business.id,
      external_post_id: p.id,
      caption: p.caption,
      permalink: p.permalink,
      posted_at: p.timestamp,
    }));

    // Existing posts are left alone so we never re-process a caption.
    const { data: stored, error: insertErr } = await admin
      .from('posts')
      .upsert(rows, {
        onConflict: 'business_id,external_post_id',
        ignoreDuplicates: true,
      })
      .select('id');

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({
      fetched: posts.length,
      stored: stored?.length ?? 0,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Could not fetch posts';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
