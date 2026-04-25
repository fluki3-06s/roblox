import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

type Body = {
  userId?: string;
  role?: 'user' | 'admin';
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
    if (!body.userId || !body.role) {
      return NextResponse.json({ error: 'userId and role are required' }, { status: 400 });
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
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: isOwner } = await supabase.rpc('is_owner', { uid: user.id });
    if (!isOwner) return NextResponse.json({ error: 'Forbidden owner only' }, { status: 403 });

    const { data, error } = await supabase.rpc('admin_set_user_role', {
      target_user_id: body.userId,
      role_name: body.role,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: Boolean(data) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
