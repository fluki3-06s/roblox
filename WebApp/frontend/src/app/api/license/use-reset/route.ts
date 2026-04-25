import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

type Body = {
  licenseId?: string;
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
    const body = (await request.json()) as Body;
    if (!body.licenseId) {
      return NextResponse.json({ error: 'licenseId is required' }, { status: 400 });
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

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase.rpc('use_hwid_reset_credit', {
      target_license_id: body.licenseId,
    });

    if (error) {
      const message = error.message || 'Failed to reset HWID';
      const status =
        message.includes('NO_RESET_CREDIT') ||
        message.includes('LICENSE_NOT_FOUND') ||
        message.includes('INVALID_LICENSE')
          ? 400
          : message.includes('UNAUTHORIZED')
            ? 401
            : 500;
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json({
      ok: true,
      remainingResetCredits: typeof data === 'number' ? data : 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
