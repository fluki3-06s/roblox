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

type RedeemBody = {
  voucherUrl?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RedeemBody;
    const voucherUrl = body.voucherUrl?.trim() ?? '';
    const isValidVoucher = /^https?:\/\/(gift\.truemoney\.com|tmn\.to)\//i.test(voucherUrl);

    if (!isValidVoucher) {
      return NextResponse.json({ error: 'Invalid voucher url' }, { status: 400 });
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

    // TODO: Replace with real TrueMoney verification callback.
    const points = 100;
    const { data, error } = await supabase.rpc('redeem_topup', {
      amount: points,
      source_name: 'truemoney',
      ref: voucherUrl,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      addedPoints: points,
      walletPoints: Number(data ?? 0),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
