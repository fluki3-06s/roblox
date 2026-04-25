import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing Supabase environment variables');
  return { url, key };
}

export async function GET(request: NextRequest) {
  try {
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
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }

    const [{ data: isAdmin, error: adminError }, { data: isOwner, error: ownerError }] = await Promise.all([
      supabase.rpc('is_admin', { uid: user.id }),
      supabase.rpc('is_owner', { uid: user.id }),
    ]);
    if (adminError || ownerError) return NextResponse.json({ isAdmin: false }, { status: 400 });
    return NextResponse.json({
      isAdmin: Boolean(isAdmin),
      isOwner: Boolean(isOwner),
      canManageRoles: Boolean(isOwner),
      userId: user.id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
