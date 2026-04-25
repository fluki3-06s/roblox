import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const nextPath = requestUrl.searchParams.get('next') || '/key-system';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const redirectResponse = NextResponse.redirect(new URL(nextPath, requestUrl.origin));

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(new URL('/key-system?auth=env-missing', requestUrl.origin));
  }

  if (!code) return redirectResponse;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          redirectResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  await supabase.auth.exchangeCodeForSession(code);
  return redirectResponse;
}
