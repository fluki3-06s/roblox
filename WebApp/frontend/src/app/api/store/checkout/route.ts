import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

type CheckoutBody = {
  productCodes?: string[];
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
    const body = (await request.json()) as CheckoutBody;
    const productCodes = Array.isArray(body.productCodes)
      ? body.productCodes.filter((item) => typeof item === 'string' && item.length > 0)
      : [];

    if (productCodes.length === 0) {
      return NextResponse.json({ error: 'Empty cart' }, { status: 400 });
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

    const { data, error } = await supabase.rpc('purchase_products', {
      product_codes: productCodes,
    });

    if (error) {
      const status =
        error.message.includes('INSUFFICIENT_POINTS') ? 400 :
        error.message.includes('INVALID_PRODUCT') ? 400 :
        500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ ok: true, purchases: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
