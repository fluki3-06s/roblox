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
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: isAdmin } = await supabase.rpc('is_admin', { uid: user.id });
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const [{ data: summary }, { data: users }, { data: licenses }, { data: topups }, { data: admins }, { data: audits }] = await Promise.all([
      supabase.rpc('admin_dashboard_summary'),
      supabase.rpc('admin_list_users'),
      supabase
        .from('licenses')
        .select('id,user_id,product_code,key_code,status,issued_at,expires_at,bound_device_hash,last_heartbeat_at,reset_hwid_count')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('topup_transactions')
        .select('id,user_id,amount_points,source,status,created_at')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase.rpc('admin_list_admin_users'),
      supabase.rpc('admin_list_audit_logs', { limit_rows: 200 }),
    ]);

    return NextResponse.json({
      summary: summary ?? {},
      users: users ?? [],
      licenses: licenses ?? [],
      topups: topups ?? [],
      admins: admins ?? [],
      audits: audits ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
