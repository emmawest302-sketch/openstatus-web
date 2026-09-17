import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getAdminClient } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { placeId } = await req.json();
    if (typeof placeId !== 'string') {
      return NextResponse.json({ error: 'placeId required' }, { status: 400 });
    }

    // Authenticate the user
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Update the businesses table via admin client
    const admin = getAdminClient();
    const { error } = await admin
      .from('businesses')
      .update({ place_id: placeId || null })
      .eq('user_id', user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
