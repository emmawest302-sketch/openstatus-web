import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';
import { extractFromCaption } from '@/lib/extract';

export const maxDuration = 60;

// Runs the filter over any posts we have not looked at yet.
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
    .select('id, name, timezone')
    .eq('user_id', userData.user.id)
    .single();

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 });
  }

  const { data: posts } = await admin
    .from('posts')
    .select('id, caption, posted_at')
    .eq('business_id', business.id)
    .is('processed_at', null)
    .order('posted_at', { ascending: false })
    .limit(10);

  if (!posts || posts.length === 0) {
    return NextResponse.json({
      checked: 0,
      suggested: 0,
      ignored: 0,
      results: [],
    });
  }

  let suggested = 0;
  let ignored = 0;
  const results: { caption: string; verdict: string; why: string }[] = [];

  for (const post of posts) {
    let verdict = 'ignored';
    let why = '';

    try {
      const out = await extractFromCaption({
        caption: post.caption ?? '',
        postedAt: post.posted_at ?? new Date().toISOString(),
        businessName: business.name,
        timezone: business.timezone ?? 'America/Chicago',
      });

      why = out.why;

      if (out.matters && out.headline) {
        const { error: insErr } = await admin.from('status_updates').insert({
          business_id: business.id,
          post_id: post.id,
          kind: out.kind === 'none' ? 'other' : out.kind,
          headline: out.headline,
          detail: out.detail,
          reason: out.reason,
          closes_at: out.closes_at,
          effective_date: out.effective_date,
          expires_at: out.expires_at,
          confidence: out.confidence,
          status: 'needs_review',
          source: 'instagram',
        });

        if (insErr) {
          why = insErr.message;
        } else {
          suggested++;
          verdict = 'ready for review';
        }
      } else {
        ignored++;
      }
    } catch (err) {
      why = err instanceof Error ? err.message : 'extraction failed';
    }

    await admin
      .from('posts')
      .update({ processed_at: new Date().toISOString() })
      .eq('id', post.id);

    results.push({
      caption: (post.caption ?? '').slice(0, 90),
      verdict,
      why,
    });
  }

  return NextResponse.json({
    checked: posts.length,
    suggested,
    ignored,
    results,
  });
}
