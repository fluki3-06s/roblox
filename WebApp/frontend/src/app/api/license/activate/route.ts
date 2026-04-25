import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

type ActivateBody = {
  licenseKey?: string;
  deviceHash?: string;
};

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing Supabase environment variables');
  return { url, key };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ActivateBody;
    const licenseKey = body.licenseKey?.trim() ?? '';
    const deviceHash = body.deviceHash?.trim() ?? '';

    if (!licenseKey || !deviceHash) {
      return NextResponse.json({ error: 'licenseKey and deviceHash are required' }, { status: 400 });
    }

    const { url, key } = getEnv();
    const response = NextResponse.next();
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const { data, error } = await supabase.rpc('activate_license', {
      license_key: licenseKey,
      device_hash: deviceHash,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, activation: data?.[0] ?? null });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
