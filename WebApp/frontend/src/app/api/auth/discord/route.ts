import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const origin = new URL(request.url).origin;
  const redirectTo = `${origin}/key-system`;

  if (!supabaseUrl) {
    return NextResponse.json(
      { error: 'Missing NEXT_PUBLIC_SUPABASE_URL' },
      { status: 500 }
    );
  }

  const authorizeUrl =
    `${supabaseUrl}/auth/v1/authorize?provider=discord` +
    `&redirect_to=${encodeURIComponent(redirectTo)}`;

  return NextResponse.redirect(authorizeUrl);
}
