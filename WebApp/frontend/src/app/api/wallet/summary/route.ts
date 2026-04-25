import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }
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
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: walletRow } = await supabase
      .from('user_wallets')
      .select('points')
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: topups } = await supabase
      .from('topup_transactions')
      .select('id, created_at')
      .eq('user_id', user.id)
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(1);

    const { count } = await supabase
      .from('topup_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'success');

    return NextResponse.json({
      points: walletRow?.points ?? 0,
      totalTopups: count ?? 0,
      lastTopupAt: topups?.[0]?.created_at ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
