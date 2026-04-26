import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

type UpsertBody = {
  code?: string;
  name?: string;
  category?: 'KEY' | 'RESETHWID';
  duration_days?: number | null;
  price_points?: number;
  discount_percent?: number;
  image_url?: string | null;
  is_active?: boolean;
  sort_order?: number;
};

type RemoveBody = {
  code?: string;
};

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing Supabase environment variables');
  return { url, key };
}

function createSupabase(request: NextRequest) {
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
  return supabase;
}

async function ensureAdmin(request: NextRequest) {
  const supabase = createSupabase(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: isAdmin } = await supabase.rpc('is_admin', { uid: user.id });
  if (!isAdmin) return { supabase, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { supabase, error: null };
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, error } = await ensureAdmin(request);
    if (error) return error;

    const { data, error: rpcError } = await supabase.rpc('admin_list_store_products');
    if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 400 });

    return NextResponse.json({ items: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as UpsertBody;
    const { supabase, error } = await ensureAdmin(request);
    if (error) return error;

    if (!body.code || !body.name || !body.category || !Number.isFinite(body.price_points)) {
      return NextResponse.json(
        { error: 'code, name, category, price_points are required' },
        { status: 400 }
      );
    }

    const normalizedDuration =
      body.category === 'KEY'
        ? body.duration_days == null
          ? null
          : Math.floor(Number(body.duration_days))
        : null;

    const { data, error: rpcError } = await supabase.rpc('admin_upsert_store_product', {
      target_code: body.code,
      target_name: body.name,
      target_category: body.category,
      target_duration_days: normalizedDuration,
      target_price_points: Math.floor(Number(body.price_points)),
      target_discount_percent: Math.floor(Number(body.discount_percent ?? 0)),
      target_image_url: body.image_url ?? null,
      target_is_active: body.is_active ?? true,
      target_sort_order: Math.floor(Number(body.sort_order ?? 0)),
    });
    if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 400 });

    return NextResponse.json({ ok: true, item: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as RemoveBody;
    if (!body.code) {
      return NextResponse.json({ error: 'code is required' }, { status: 400 });
    }

    const { supabase, error } = await ensureAdmin(request);
    if (error) return error;

    const { data, error: rpcError } = await supabase.rpc('admin_remove_store_product', {
      target_code: body.code,
    });
    if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 400 });

    return NextResponse.json({ ok: true, mode: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
