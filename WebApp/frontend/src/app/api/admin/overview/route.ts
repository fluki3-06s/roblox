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

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parseDateOrNull(value: string) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return value;
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

    const searchParams = request.nextUrl.searchParams;
    const pageSize = Math.min(parsePositiveInt(searchParams.get('pageSize'), 50), 100);
    const usersPage = parsePositiveInt(searchParams.get('usersPage'), 1);
    const licensesPage = parsePositiveInt(searchParams.get('licensesPage'), 1);
    const topupsPage = parsePositiveInt(searchParams.get('topupsPage'), 1);
    const auditsPage = parsePositiveInt(searchParams.get('auditsPage'), 1);
    const usersSearch = (searchParams.get('usersSearch') ?? '').trim().toLowerCase();
    const licensesSearch = (searchParams.get('licensesSearch') ?? '').trim();
    const topupsSearch = (searchParams.get('topupsSearch') ?? '').trim();
    const auditSearch = (searchParams.get('auditSearch') ?? '').trim().toLowerCase();
    const filterAction = (searchParams.get('filterAction') ?? 'ALL').trim();
    const filterActor = (searchParams.get('filterActor') ?? '').trim().toLowerCase();
    const filterDateFrom = (searchParams.get('filterDateFrom') ?? '').trim();
    const filterDateTo = (searchParams.get('filterDateTo') ?? '').trim();

    const [{ data: summary }, { data: admins }] = await Promise.all([
      supabase.rpc('admin_dashboard_summary'),
      supabase.rpc('admin_list_admin_users'),
    ]);

    const usersOffset = (usersPage - 1) * pageSize;
    const { data: usersPagedRows, error: usersPagedError } = await supabase.rpc('admin_list_users_paged', {
      limit_rows: pageSize,
      offset_rows: usersOffset,
      search_query: usersSearch || null,
    });

    let usersItems: Array<Record<string, unknown>> = [];
    let usersTotal = 0;
    let usersPaged = true;
    if (usersPagedError) {
      usersPaged = false;
      const { data: allUsers } = await supabase.rpc('admin_list_users');
      const filteredUsers = (allUsers ?? []).filter((u: { email: string | null; user_id: string }) => {
        if (!usersSearch) return true;
        return (u.email || '').toLowerCase().includes(usersSearch) || u.user_id.toLowerCase().includes(usersSearch);
      });
      usersTotal = filteredUsers.length;
      usersItems = filteredUsers.slice(usersOffset, usersOffset + pageSize) as Array<Record<string, unknown>>;
    } else {
      const rows = (usersPagedRows ?? []) as Array<Record<string, unknown> & { total_count?: number }>;
      usersItems = rows.map(({ total_count, ...rest }) => rest);
      usersTotal = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
    }

    let licensesQuery = supabase
      .from('licenses')
      .select('id,user_id,product_code,key_code,status,issued_at,expires_at,bound_device_hash,last_heartbeat_at,reset_hwid_count', { count: 'exact' })
      .order('created_at', { ascending: false });
    if (licensesSearch) {
      const escaped = licensesSearch.replace(/[%_,]/g, '');
      const terms: string[] = [
        `key_code.ilike.%${escaped}%`,
        `product_code.ilike.%${escaped}%`,
        `status.ilike.%${escaped}%`,
      ];
      if (isUuid(escaped)) {
        terms.push(`id.eq.${escaped}`);
        terms.push(`user_id.eq.${escaped}`);
      }
      licensesQuery = licensesQuery.or(terms.join(','));
    }
    const licensesFrom = (licensesPage - 1) * pageSize;
    const licensesTo = licensesFrom + pageSize - 1;
    const { data: licensesItems, count: licensesTotal } = await licensesQuery.range(licensesFrom, licensesTo);

    let topupsQuery = supabase
      .from('topup_transactions')
      .select('id,user_id,amount_points,source,status,created_at', { count: 'exact' })
      .order('created_at', { ascending: false });
    if (topupsSearch) {
      const escaped = topupsSearch.replace(/[%_,]/g, '');
      const terms: string[] = [`source.ilike.%${escaped}%`, `status.ilike.%${escaped}%`];
      if (isUuid(escaped)) {
        terms.push(`id.eq.${escaped}`);
        terms.push(`user_id.eq.${escaped}`);
      }
      if (/^\d+$/.test(escaped)) {
        terms.push(`amount_points.eq.${Number(escaped)}`);
      }
      topupsQuery = topupsQuery.or(terms.join(','));
    }
    const topupsFrom = (topupsPage - 1) * pageSize;
    const topupsTo = topupsFrom + pageSize - 1;
    const { data: topupsItems, count: topupsTotal } = await topupsQuery.range(topupsFrom, topupsTo);

    const auditsOffset = (auditsPage - 1) * pageSize;
    const { data: auditsPagedRows, error: auditsPagedError } = await supabase.rpc('admin_list_audit_logs_paged', {
      limit_rows: pageSize,
      offset_rows: auditsOffset,
      search_query: auditSearch || null,
      filter_action: filterAction || 'ALL',
      filter_actor: filterActor || null,
      date_from: parseDateOrNull(filterDateFrom),
      date_to: parseDateOrNull(filterDateTo),
    });

    let auditsItems: Array<Record<string, unknown>> = [];
    let auditsTotal = 0;
    let auditMaxFetched: number | null = null;
    let auditsPaged = true;
    if (auditsPagedError) {
      auditsPaged = false;
      const { data: allAudits } = await supabase.rpc('admin_list_audit_logs', { limit_rows: 1000 });
      const filteredAudits = (allAudits ?? []).filter(
        (item: {
          id: string;
          actor_user_id: string;
          action: string;
          target_user_id: string | null;
          target_license_id: string | null;
          details: Record<string, unknown>;
          created_at: string;
        }) => {
          if (filterAction !== 'ALL' && item.action !== filterAction) return false;
          if (filterActor && !item.actor_user_id.toLowerCase().includes(filterActor)) return false;
          const itemDate = new Date(item.created_at);
          if (filterDateFrom) {
            const from = new Date(filterDateFrom);
            from.setHours(0, 0, 0, 0);
            if (itemDate < from) return false;
          }
          if (filterDateTo) {
            const to = new Date(filterDateTo);
            to.setHours(23, 59, 59, 999);
            if (itemDate > to) return false;
          }
          if (auditSearch) {
            const rowText = [
              item.id,
              item.actor_user_id,
              item.action,
              item.target_user_id ?? '',
              item.target_license_id ?? '',
              JSON.stringify(item.details),
            ]
              .join(' ')
              .toLowerCase();
            if (!rowText.includes(auditSearch)) return false;
          }
          return true;
        }
      );
      auditsTotal = filteredAudits.length;
      auditsItems = filteredAudits.slice(auditsOffset, auditsOffset + pageSize) as Array<Record<string, unknown>>;
      auditMaxFetched = 1000;
    } else {
      const rows = (auditsPagedRows ?? []) as Array<Record<string, unknown> & { total_count?: number }>;
      auditsItems = rows.map(({ total_count, ...rest }) => rest);
      auditsTotal = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const { data: recentTopups } = await supabase
      .from('topup_transactions')
      .select('amount_points,created_at,status')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    const topupByDay = new Map<string, number>();
    (recentTopups ?? []).forEach((row: { amount_points: number; created_at: string; status: string }) => {
      if (row.status !== 'success') return;
      const key = new Date(row.created_at).toISOString().slice(0, 10);
      topupByDay.set(key, (topupByDay.get(key) ?? 0) + row.amount_points);
    });

    return NextResponse.json({
      summary: summary ?? {},
      users: {
        items: usersItems,
        total: usersTotal,
        page: usersPage,
        pageSize,
        source: usersPaged ? 'rpc_paged' : 'rpc_legacy_fallback',
      },
      licenses: {
        items: licensesItems ?? [],
        total: licensesTotal ?? 0,
        page: licensesPage,
        pageSize,
      },
      topups: {
        items: topupsItems ?? [],
        total: topupsTotal ?? 0,
        page: topupsPage,
        pageSize,
      },
      admins: admins ?? [],
      audits: {
        items: auditsItems,
        total: auditsTotal,
        page: auditsPage,
        pageSize,
        maxFetched: auditMaxFetched,
        source: auditsPaged ? 'rpc_paged' : 'rpc_legacy_fallback',
      },
      topup7d: Array.from(topupByDay.entries()).map(([date, amount]) => ({ date, amount })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
