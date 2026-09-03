import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';

const BUCKET = 'openstatus-business-assets';
const MAX_BYTES = 5 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

async function getOwner(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!jwt) return null;

  const admin = getAdminClient();
  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData.user) return null;

  const { data: business } = await admin
    .from('businesses')
    .select('id')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  return business ? { admin, businessId: business.id } : null;
}

async function ensureBucket(admin: ReturnType<typeof getAdminClient>) {
  const { data: bucket } = await admin.storage.getBucket(BUCKET);
  if (!bucket) {
    const { error } = await admin.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: Object.keys(MIME_EXTENSIONS),
    });
    if (error && !error.message.toLowerCase().includes('already')) throw error;
    return;
  }

  if (bucket.public) throw new Error('Business asset storage must remain private');
}

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get('businessId') ?? '';
  const kind = req.nextUrl.searchParams.get('kind');
  if (!businessId || (kind !== 'avatar' && kind !== 'header')) {
    return new NextResponse(null, { status: 400 });
  }

  const admin = getAdminClient();
  const column = kind === 'avatar' ? 'avatar_url' : 'header_url';
  const { data: business } = await admin
    .from('businesses')
    .select('avatar_url, header_url')
    .eq('id', businessId)
    .maybeSingle();
  const reference = business?.[column];
  if (typeof reference !== 'string' || !reference.startsWith('storage:')) {
    return new NextResponse(null, { status: 404 });
  }

  const path = reference.slice('storage:'.length);
  if (!path.startsWith(`${businessId}/${kind}-`)) {
    return new NextResponse(null, { status: 404 });
  }

  const { data, error } = await admin.storage.from(BUCKET).download(path);
  if (error || !data) return new NextResponse(null, { status: 404 });

  return new NextResponse(await data.arrayBuffer(), {
    headers: {
      'Content-Type': data.type || 'application/octet-stream',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function POST(req: NextRequest) {
  const owner = await getOwner(req);
  if (!owner) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const action = body?.action;
  const kind = body?.kind === 'avatar' || body?.kind === 'header' || body?.kind === 'menu'
    ? body.kind
    : null;
  if (!kind) {
    return NextResponse.json({ error: 'Choose a logo or cover image' }, { status: 400 });
  }

  try {
    await ensureBucket(owner.admin);

    if (action === 'prepare') {
      const contentType = typeof body?.contentType === 'string' ? body.contentType : '';
      const size = typeof body?.size === 'number' ? body.size : 0;
      const extension = MIME_EXTENSIONS[contentType];
      if (!extension) {
        return NextResponse.json({ error: 'Use a JPG, PNG, or WebP image' }, { status: 400 });
      }
      if (!size || size > MAX_BYTES) {
        return NextResponse.json({ error: 'Image must be smaller than 5 MB' }, { status: 400 });
      }

      const path = `${owner.businessId}/${kind}-${Date.now()}-${crypto.randomUUID()}.${extension}`;
      const { data, error } = await owner.admin.storage
        .from(BUCKET)
        .createSignedUploadUrl(path, { upsert: false });
      if (error || !data) throw error ?? new Error('Could not prepare upload');

      return NextResponse.json({ bucket: BUCKET, path, token: data.token });
    }

    if (action === 'complete') {
      const path = typeof body?.path === 'string' ? body.path : '';
      const expectedPrefix = `${owner.businessId}/${kind}-`;
      if (!path.startsWith(expectedPrefix)) {
        return NextResponse.json({ error: 'Upload path is not valid' }, { status: 400 });
      }

      const reference = `storage:${path}`;
      if (kind !== 'menu') {
        const column = kind === 'avatar' ? 'avatar_url' : 'header_url';
        const { error } = await owner.admin
          .from('businesses')
          .update({ [column]: reference, updated_at: new Date().toISOString() })
          .eq('id', owner.businessId);
        if (error) throw error;
      }

      return NextResponse.json({
        reference,
        url: kind === 'menu' ? null : `/api/assets?businessId=${owner.businessId}&kind=${kind}`,
      });
    }

    return NextResponse.json({ error: 'Invalid upload action' }, { status: 400 });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
