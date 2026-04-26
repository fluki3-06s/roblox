'use client';

import { useEffect, useMemo, useState } from 'react';
import { Header, Footer } from '@/components/layout';
import { ProtectedPageGate } from '@/components/auth/ProtectedPageGate';

type AdminSummary = {
  usersCount: number;
  activeLicensesCount: number;
  totalTopups: number;
  totalRevenuePoints: number;
};

type AdminUser = {
  user_id: string;
  email: string | null;
  points: number;
  total_topups: number;
  active_licenses: number;
  reset_credits_available: number;
  created_at: string;
};

type AdminLicense = {
  id: string;
  user_id: string;
  product_code: string;
  key_code: string;
  status: string;
  issued_at: string;
  expires_at: string | null;
  bound_device_hash: string | null;
  last_heartbeat_at: string | null;
  reset_hwid_count: number;
};

type AdminTopup = {
  id: string;
  user_id: string;
  amount_points: number;
  source: string;
  status: string;
  created_at: string;
};

type AdminAuditLog = {
  id: string;
  actor_user_id: string;
  action: string;
  target_user_id: string | null;
  target_license_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

type TopupDay = {
  date: string;
  amount: number;
};

type AdminStoreProduct = {
  code: string;
  name: string;
  category: 'KEY' | 'RESETHWID';
  duration_days: number | null;
  price_points: number;
  discount_percent: number;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
};

const formatTHB = (amount: number) =>
  new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(amount);
const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(value);
const PAGE_SIZE = 50;
const selectClassName =
  'w-full appearance-none rounded-md border border-white/10 bg-black/40 px-3 py-2 pr-9 text-sm text-white outline-none transition focus:border-red-700/60 focus:ring-2 focus:ring-red-700/30';

const formatAuditAction = (action: string) =>
  action
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const formatAuditDetails = (details: Record<string, unknown>) => JSON.stringify(details, null, 2);

export default function AdminDashboardClient() {
  const [loading, setLoading] = useState(true);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [tab, setTab] = useState<'overview' | 'users' | 'licenses' | 'topups' | 'audit' | 'store'>('overview');
  const [isOwner, setIsOwner] = useState(false);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [licenses, setLicenses] = useState<AdminLicense[]>([]);
  const [topups, setTopups] = useState<AdminTopup[]>([]);
  const [adminUserIds, setAdminUserIds] = useState<string[]>([]);
  const [audits, setAudits] = useState<AdminAuditLog[]>([]);
  const [filterAction, setFilterAction] = useState('ALL');
  const [filterActor, setFilterActor] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [licenseSearch, setLicenseSearch] = useState('');
  const [topupSearch, setTopupSearch] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedProductCode, setSelectedProductCode] = useState('key_30d');
  const [setPointValue, setSetPointValue] = useState('');
  const [grantResetCreditsValue, setGrantResetCreditsValue] = useState('1');
  const [userSearch, setUserSearch] = useState('');
  const [roleAction, setRoleAction] = useState<'admin' | 'user'>('admin');
  const [usersListOpen, setUsersListOpen] = useState(true);
  const [userActionsOpen, setUserActionsOpen] = useState(true);
  const [roleConfirm, setRoleConfirm] = useState<{
    userId: string;
    email: string | null;
    from: 'admin' | 'user';
    to: 'admin' | 'user';
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [usersPage, setUsersPage] = useState(1);
  const [licensesPage, setLicensesPage] = useState(1);
  const [topupsPage, setTopupsPage] = useState(1);
  const [auditsPage, setAuditsPage] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [licensesTotal, setLicensesTotal] = useState(0);
  const [topupsTotal, setTopupsTotal] = useState(0);
  const [auditsTotal, setAuditsTotal] = useState(0);
  const [auditsFetchCap, setAuditsFetchCap] = useState<number | null>(null);
  const [topup7d, setTopup7d] = useState<TopupDay[]>([]);
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);
  const [storeProducts, setStoreProducts] = useState<AdminStoreProduct[]>([]);
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeSaving, setStoreSaving] = useState(false);
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [storeRemoving, setStoreRemoving] = useState(false);
  const [removeProductConfirm, setRemoveProductConfirm] = useState<{
    code: string;
    name: string;
  } | null>(null);
  const [storeForm, setStoreForm] = useState<AdminStoreProduct>({
    code: '',
    name: '',
    category: 'KEY',
    duration_days: 30,
    price_points: 0,
    discount_percent: 0,
    image_url: '',
    is_active: true,
    sort_order: 0,
  });
  const createEmptyStoreForm = (items: AdminStoreProduct[]): AdminStoreProduct => ({
    code: '',
    name: '',
    category: 'KEY',
    duration_days: 30,
    price_points: 0,
    discount_percent: 0,
    image_url: '',
    is_active: true,
    sort_order: (items.length > 0 ? items[items.length - 1].sort_order : 0) + 1,
  });

  const productCodes = useMemo(
    () => ['key_1d', 'key_3d', 'key_7d', 'key_14d', 'key_30d', 'key_lifetime'],
    []
  );
  const selectedUser = useMemo(
    () => users.find((u) => u.user_id === selectedUserId) ?? null,
    [users, selectedUserId]
  );
  const selectedUserRole = useMemo<'admin' | 'user'>(() => {
    if (!selectedUser) return 'user';
    return adminUserIds.includes(selectedUser.user_id) ? 'admin' : 'user';
  }, [adminUserIds, selectedUser]);
  const productLabelByCode: Record<string, string> = {
    key_1d: 'Key 1Day',
    key_3d: 'Key 3Day',
    key_7d: 'Key 7Day',
    key_14d: 'Key 14Day',
    key_30d: 'Key 30Day',
    key_lifetime: 'Key Lifetime',
  };
  const topup7Day = useMemo(() => {
    const now = new Date();
    const days: Array<{ key: string; label: string; value: number }> = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString(undefined, { weekday: 'short' });
      days.push({ key, label, value: 0 });
    }

    const volumeByDate = new Map(topup7d.map((item) => [item.date, item.amount]));
    days.forEach((item) => {
      const value = volumeByDate.get(item.key);
      if (typeof value === 'number') item.value = value;
    });

    return days;
  }, [topup7d]);

  const loadOverview = async () => {
    setSectionLoading(true);
    try {
      const params = new URLSearchParams({
        pageSize: String(PAGE_SIZE),
        usersPage: String(usersPage),
        licensesPage: String(licensesPage),
        topupsPage: String(topupsPage),
        auditsPage: String(auditsPage),
        usersSearch: userSearch,
        licensesSearch: licenseSearch,
        topupsSearch: topupSearch,
        auditSearch,
        filterAction,
        filterActor,
        filterDateFrom,
        filterDateTo,
      });

      const res = await fetch(`/api/admin/overview?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load admin data');
      const data = (await res.json()) as {
        summary: AdminSummary;
        users: { items: AdminUser[]; total: number };
        licenses: { items: AdminLicense[]; total: number };
        topups: { items: AdminTopup[]; total: number };
        admins: Array<{ user_id: string }>;
        audits: { items: AdminAuditLog[]; total: number; maxFetched?: number };
        topup7d?: TopupDay[];
      };
      setSummary(data.summary);
      setUsers(data.users?.items ?? []);
      setUsersTotal(data.users?.total ?? 0);
      setLicenses(data.licenses?.items ?? []);
      setLicensesTotal(data.licenses?.total ?? 0);
      setTopups(data.topups?.items ?? []);
      setTopupsTotal(data.topups?.total ?? 0);
      setAdminUserIds((data.admins ?? []).map((item) => item.user_id));
      setAudits(data.audits?.items ?? []);
      setAuditsTotal(data.audits?.total ?? 0);
      setAuditsFetchCap(data.audits?.maxFetched ?? null);
      setTopup7d(data.topup7d ?? []);
      if (!selectedUserId && (data.users?.items?.length ?? 0) > 0) {
        setSelectedUserId(data.users.items[0].user_id);
      }
    } finally {
      setSectionLoading(false);
    }
  };

  const auditActions = useMemo(() => {
    const set = new Set<string>();
    audits.forEach((item) => set.add(item.action));
    return ['ALL', ...Array.from(set).sort()];
  }, [audits]);

  const usersTotalPages = Math.max(1, Math.ceil(usersTotal / PAGE_SIZE));
  const licensesTotalPages = Math.max(1, Math.ceil(licensesTotal / PAGE_SIZE));
  const topupsTotalPages = Math.max(1, Math.ceil(topupsTotal / PAGE_SIZE));
  const auditsTotalPages = Math.max(1, Math.ceil(auditsTotal / PAGE_SIZE));

  useEffect(() => {
    setUsersPage(1);
  }, [userSearch]);
  useEffect(() => {
    setLicensesPage(1);
  }, [licenseSearch]);
  useEffect(() => {
    setTopupsPage(1);
  }, [topupSearch]);
  useEffect(() => {
    setAuditsPage(1);
  }, [filterAction, filterActor, filterDateFrom, filterDateTo, auditSearch]);

  useEffect(() => {
    if (usersPage > usersTotalPages) setUsersPage(usersTotalPages);
  }, [usersPage, usersTotalPages]);
  useEffect(() => {
    if (licensesPage > licensesTotalPages) setLicensesPage(licensesTotalPages);
  }, [licensesPage, licensesTotalPages]);
  useEffect(() => {
    if (topupsPage > topupsTotalPages) setTopupsPage(topupsTotalPages);
  }, [topupsPage, topupsTotalPages]);
  useEffect(() => {
    if (auditsPage > auditsTotalPages) setAuditsPage(auditsTotalPages);
  }, [auditsPage, auditsTotalPages]);


  useEffect(() => {
    const init = async () => {
      try {
        const me = await fetch('/api/admin/me', { cache: 'no-store' });
        if (!me.ok) {
          setAuthorized(false);
          return;
        }
        const meData = (await me.json()) as { isAdmin: boolean; isOwner?: boolean };
        if (!meData.isAdmin) {
          setAuthorized(false);
          return;
        }
        setIsOwner(Boolean(meData.isOwner));
        setAuthorized(true);
      } catch {
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, []);

  useEffect(() => {
    if (!authorized) return;
    void loadOverview();
  }, [
    authorized,
    usersPage,
    licensesPage,
    topupsPage,
    auditsPage,
    userSearch,
    licenseSearch,
    topupSearch,
    auditSearch,
    filterAction,
    filterActor,
    filterDateFrom,
    filterDateTo,
  ]);

  useEffect(() => {
    if (!authorized || tab !== 'store') return;
    void loadStoreProducts();
  }, [authorized, tab]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const onCopyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(`${label} copied`);
    } catch {
      showToast(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  const onSetPoints = async () => {
    if (!selectedUserId || !setPointValue) return;
    const points = Number(setPointValue);
    if (!Number.isFinite(points) || points < 0) {
      showToast('Invalid point value');
      return;
    }
    const res = await fetch('/api/admin/set-points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: selectedUserId, points }),
    });
    const body = (await res.json()) as { error?: string };
    if (!res.ok) {
      showToast(body.error || 'Set points failed');
      return;
    }
    showToast('Points updated');
    await loadOverview();
  };

  const onGrantLicense = async () => {
    if (!selectedUserId) return;
    const res = await fetch('/api/admin/grant-license', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: selectedUserId, productCode: selectedProductCode }),
    });
    const body = (await res.json()) as { error?: string };
    if (!res.ok) {
      showToast(body.error || 'Grant license failed');
      return;
    }
    showToast('License granted');
    await loadOverview();
  };

  const onGrantResetCredits = async () => {
    if (!selectedUserId) return;
    const amount = Number(grantResetCreditsValue);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('Invalid reset credit amount');
      return;
    }

    const res = await fetch('/api/admin/grant-reset-credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: selectedUserId, amount: Math.floor(amount) }),
    });
    const body = (await res.json()) as { error?: string };
    if (!res.ok) {
      showToast(body.error || 'Grant reset credits failed');
      return;
    }
    showToast('ResetHWID credits granted');
    await loadOverview();
  };

  const onLicenseAction = async (licenseId: string, action: 'delete' | 'renew' | 'reset_hwid') => {
    const res = await fetch('/api/admin/license-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseId, action }),
    });
    const body = (await res.json()) as { error?: string };
    if (!res.ok) {
      showToast(body.error || 'License action failed');
      return;
    }
    showToast('License updated');
    await loadOverview();
  };

  const onSetRole = async (userId: string, role: 'user' | 'admin') => {
    const res = await fetch('/api/admin/set-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    });
    const body = (await res.json()) as { error?: string };
    if (!res.ok) {
      showToast(body.error || 'Set role failed');
      return;
    }
    showToast(`Role updated to ${role}`);
    await loadOverview();
  };

  const loadStoreProducts = async () => {
    setStoreLoading(true);
    try {
      const res = await fetch('/api/admin/store-products', { cache: 'no-store' });
      const body = (await res.json()) as { error?: string; items?: AdminStoreProduct[] };
      if (!res.ok) {
        showToast(body.error || 'Load store products failed');
        return;
      }
      const items = Array.isArray(body.items) ? body.items : [];
      setStoreProducts(items);
      if (items.length > 0) {
        setStoreForm({
          ...items[0],
          image_url: items[0].image_url ?? '',
        });
      } else {
        setStoreForm(createEmptyStoreForm(items));
      }
    } finally {
      setStoreLoading(false);
    }
  };

  const onSaveStoreProduct = async () => {
    if (!storeForm.code.trim() || !storeForm.name.trim()) {
      showToast('Code and name are required');
      return;
    }
    if (storeForm.price_points < 0) {
      showToast('Price must be >= 0');
      return;
    }
    if (storeForm.discount_percent < 0 || storeForm.discount_percent > 90) {
      showToast('Discount must be between 0 and 90');
      return;
    }

    setStoreSaving(true);
    try {
      const res = await fetch('/api/admin/store-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...storeForm,
          code: storeForm.code.trim().toLowerCase(),
          name: storeForm.name.trim(),
          image_url: storeForm.image_url?.trim() || null,
          duration_days: storeForm.category === 'KEY'
            ? (storeForm.duration_days == null ? null : Math.floor(storeForm.duration_days))
            : null,
          price_points: Math.floor(storeForm.price_points),
          discount_percent: Math.floor(storeForm.discount_percent),
          sort_order: Math.floor(storeForm.sort_order),
        }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        showToast(body.error || 'Save store product failed');
        return;
      }
      showToast('Store product saved');
      await loadStoreProducts();
      setShowNewProductModal(false);
    } finally {
      setStoreSaving(false);
    }
  };

  const onRemoveStoreProduct = async () => {
    if (!storeForm.code) return;
    const targetCode = storeForm.code;
    setStoreRemoving(true);
    try {
      const res = await fetch('/api/admin/store-products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: targetCode }),
      });
      const body = (await res.json()) as { error?: string; mode?: string };
      if (!res.ok) {
        showToast(body.error || 'Remove store product failed');
        return;
      }
      showToast(body.mode === 'deactivated' ? 'Product deactivated (has purchase history)' : 'Product removed');
      await loadStoreProducts();
    } finally {
      setStoreRemoving(false);
    }
  };

  return (
    <ProtectedPageGate>
      <div className="min-h-screen relative">
        <Header />
        <main className="overflow-x-hidden pt-20 sm:pt-24 pb-16 sm:pb-20 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-red-800 mb-2">Admin</p>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">Dashboard</h1>
            </div>

            {loading ? (
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6 text-[var(--muted)]">Loading admin data...</div>
            ) : !authorized ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-300">You are not authorized to access admin dashboard.</div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-6">
                  {(['overview', 'users', 'licenses', 'topups', 'audit', 'store'] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setTab(item)}
                      className={`px-4 py-2 rounded-lg text-sm ${tab === item ? 'bg-red-800 text-white' : 'bg-white/5 text-[var(--muted)]'}`}
                    >
                      {item.toUpperCase()}
                    </button>
                  ))}
                </div>

                {tab === 'overview' && (
                  sectionLoading || !summary ? (
                    <OverviewSkeleton />
                  ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <Card label="Users" value={String(summary.usersCount)} />
                      <Card label="Active Licenses" value={String(summary.activeLicensesCount)} />
                      <Card label="Topups" value={String(summary.totalTopups)} />
                      <Card label="Revenue" value={formatTHB(summary.totalRevenuePoints)} />
                    </div>

                    <div className="grid grid-cols-1 gap-4 mb-8">
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                        <h3 className="text-sm font-semibold text-white mb-3">Topup Volume (7 Days)</h3>
                        <div className="h-48 flex items-end gap-2">
                          {topup7Day.map((item) => {
                            const max = Math.max(...topup7Day.map((x) => x.value), 1);
                            return (
                              <div key={item.key} className="flex-1 flex flex-col items-center justify-end gap-2">
                                <span className="text-[10px] text-white/70">
                                  {item.value > 0 ? formatTHB(item.value) : '-'}
                                </span>
                                <div
                                  className="w-full rounded-t bg-gradient-to-t from-red-800/80 to-red-500/80"
                                  style={{ height: `${Math.max(10, (item.value / max) * 100)}%` }}
                                />
                                <span className="text-[10px] text-[var(--muted)]">{item.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </>
                  )
                )}

                {tab === 'users' && (
                  sectionLoading ? (
                    <UsersSkeleton />
                  ) : (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-4 sm:p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">User Management</p>
                          <p className="mt-1 text-sm text-white/75">Search, select users, and manage permissions in one place.</p>
                        </div>
                        <input
                          className="w-full sm:w-80 px-3 py-2.5 rounded-lg bg-black/40 border border-white/10 text-white text-sm placeholder:text-[var(--muted)] focus:outline-none focus:border-red-700/60"
                          placeholder="Search by email or UUID"
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                        />
                      </div>

                      <div className="xl:hidden grid grid-cols-2 gap-2 mb-1">
                        <button
                          type="button"
                          onClick={() => setUsersListOpen((prev) => !prev)}
                          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white"
                        >
                          {usersListOpen ? 'Hide Users' : 'Show Users'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setUserActionsOpen((prev) => !prev)}
                          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white"
                        >
                          {userActionsOpen ? 'Hide Manage' : 'Show Manage'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-4">
                        <div className={`${usersListOpen ? 'block' : 'hidden'} xl:block rounded-xl border border-white/[0.08] bg-black/35 overflow-hidden`}>
                          <div className="px-3 py-2 border-b border-white/[0.08] text-xs text-[var(--muted)]">
                            Users ({usersTotal})
                          </div>
                          <div className="p-2 space-y-1 max-h-[420px] overflow-auto">
                            {users.map((u) => {
                              const active = selectedUserId === u.user_id;
                              return (
                                <button
                                  key={u.user_id}
                                  type="button"
                                  onClick={() => setSelectedUserId(u.user_id)}
                                  className={`w-full text-left rounded-lg px-3 py-2.5 transition-all border ${
                                    active
                                      ? 'bg-red-800/20 border-red-700/50 shadow-[0_0_0_1px_rgba(185,28,28,0.2)]'
                                      : 'hover:bg-white/[0.04] border-transparent'
                                  }`}
                                >
                                  <p className="text-sm text-white truncate">{u.email || 'No email'}</p>
                                  <p className="text-[11px] text-[var(--muted)] font-mono truncate mt-0.5">{u.user_id}</p>
                                </button>
                              );
                            })}
                            {users.length === 0 && (
                              <p className="px-3 py-6 text-sm text-[var(--muted)] text-center">No users found.</p>
                            )}
                          </div>
                        </div>

                        <div className={`${userActionsOpen ? 'block' : 'hidden'} xl:block rounded-xl border border-white/[0.08] bg-black/30 p-4 space-y-4`}>
                          {selectedUser ? (
                            <>
                              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                  <span className="px-2.5 py-1 rounded-md bg-white/5 text-xs text-white">{selectedUser.email || 'No email'}</span>
                                  <span className="px-2.5 py-1 rounded-md bg-white/5 text-xs text-[var(--muted)] font-mono">{selectedUser.user_id}</span>
                                  <span className="px-2.5 py-1 rounded-md bg-emerald-700/20 text-xs text-emerald-300">
                                    {adminUserIds.includes(selectedUser.user_id) ? 'admin' : 'user'}
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-1">
                                  <div className="rounded-lg border border-white/[0.08] bg-white/[0.015] px-3.5 py-3">
                                    <p className="text-[11px] text-white/55">Points</p>
                                    <p className="mt-1 text-lg font-semibold text-white">{formatNumber(selectedUser.points)}</p>
                                  </div>
                                  <div className="rounded-lg border border-white/[0.08] bg-white/[0.015] px-3.5 py-3">
                                    <p className="text-[11px] text-white/55">Topups</p>
                                    <p className="mt-1 text-lg font-semibold text-white">{selectedUser.total_topups}</p>
                                  </div>
                                  <div className="rounded-lg border border-white/[0.08] bg-white/[0.015] px-3.5 py-3">
                                    <p className="text-[11px] text-white/55">Active Keys</p>
                                    <p className="mt-1 text-lg font-semibold text-white">{selectedUser.active_licenses}</p>
                                  </div>
                                  <div className="rounded-lg border border-white/[0.08] bg-white/[0.015] px-3.5 py-3">
                                    <p className="text-[11px] text-white/55">ResetHWID Credits</p>
                                    <p className="mt-1 text-lg font-semibold text-white">{selectedUser.reset_credits_available}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 space-y-2.5">
                                  <p className="text-xs font-semibold text-white">Wallet</p>
                                  <input
                                    className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-white text-sm"
                                    placeholder="Set points"
                                    value={setPointValue}
                                    onChange={(e) => setSetPointValue(e.target.value)}
                                  />
                                  <button
                                    type="button"
                                    onClick={onSetPoints}
                                    className="w-full px-3 py-2 rounded-md bg-white/10 hover:bg-white/15 text-white text-sm"
                                  >
                                    Update Points
                                  </button>
                                </div>

                                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 space-y-2.5">
                                  <p className="text-xs font-semibold text-white">Grant License</p>
                                  <div className="relative">
                                    <select
                                      className={selectClassName}
                                      value={selectedProductCode}
                                      onChange={(e) => setSelectedProductCode(e.target.value)}
                                    >
                                      {productCodes.map((code) => (
                                        <option key={code} value={code} className="bg-[#0b0b0f] text-white">
                                          {productLabelByCode[code] || code}
                                        </option>
                                      ))}
                                    </select>
                                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/60">▼</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={onGrantLicense}
                                    className="w-full px-3 py-2 rounded-md bg-red-800 hover:bg-red-700 text-white text-sm"
                                  >
                                    Grant Key
                                  </button>
                                </div>

                                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 space-y-2.5">
                                  <p className="text-xs font-semibold text-white">Role</p>
                                  <div className="relative">
                                    <select
                                      className={selectClassName}
                                      value={roleAction}
                                      onChange={(e) => setRoleAction(e.target.value as 'admin' | 'user')}
                                      disabled={!isOwner}
                                    >
                                      <option value="admin" className="bg-[#0b0b0f] text-white">Admin</option>
                                      <option value="user" className="bg-[#0b0b0f] text-white">User</option>
                                    </select>
                                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/60">▼</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (roleAction === selectedUserRole) {
                                        showToast(`User is already ${selectedUserRole}`);
                                        return;
                                      }
                                      setRoleConfirm({
                                        userId: selectedUser.user_id,
                                        email: selectedUser.email,
                                        from: selectedUserRole,
                                        to: roleAction,
                                      });
                                    }}
                                    disabled={!isOwner}
                                    className="w-full px-3 py-2 rounded-md bg-amber-700/70 hover:bg-amber-600/70 disabled:opacity-50 text-white text-sm"
                                  >
                                    Apply Role
                                  </button>
                                </div>

                                <div className="rounded-xl border border-red-500/20 bg-red-500/[0.08] p-3.5 space-y-2.5">
                                  <p className="text-xs font-semibold text-red-100">Grant ResetHWID Credits</p>
                                  <input
                                    type="number"
                                    min={1}
                                    className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-white text-sm"
                                    placeholder="Amount"
                                    value={grantResetCreditsValue}
                                    onChange={(e) => setGrantResetCreditsValue(e.target.value)}
                                  />
                                  <button
                                    type="button"
                                    onClick={onGrantResetCredits}
                                    className="w-full px-3 py-2 rounded-md bg-red-700 hover:bg-red-600 text-white text-sm"
                                  >
                                    Grant Credits
                                  </button>
                                </div>
                              </div>

                              {!isOwner && <p className="text-xs text-[var(--muted)]">Role management is owner-only.</p>}
                            </>
                          ) : (
                            <p className="text-sm text-[var(--muted)]">Select a user to manage.</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <TableShell>
                      <table className="w-full text-sm">
                        <thead className="text-left text-[var(--muted)]">
                          <tr>
                            <th className="px-4 py-2">User</th>
                            <th className="px-4 py-2">Email</th>
                            <th className="px-4 py-2">Points</th>
                            <th className="px-4 py-2">Topups</th>
                            <th className="px-4 py-2">Active Keys</th>
                            <th className="px-4 py-2">Reset Credits</th>
                            <th className="px-4 py-2">Role</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((u) => (
                            <tr key={u.user_id} className="border-t border-white/[0.08] text-white/90">
                              <td className="px-4 py-2 font-mono text-xs">{u.user_id}</td>
                              <td className="px-4 py-2">{u.email || '-'}</td>
                              <td className="px-4 py-2">{formatNumber(u.points)}</td>
                              <td className="px-4 py-2">{u.total_topups}</td>
                              <td className="px-4 py-2">{u.active_licenses}</td>
                              <td className="px-4 py-2">{u.reset_credits_available}</td>
                              <td className="px-4 py-2">{adminUserIds.includes(u.user_id) ? 'admin' : 'user'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </TableShell>
                    <PaginationControls
                      page={usersPage}
                      totalPages={usersTotalPages}
                      totalItems={usersTotal}
                      pageSize={PAGE_SIZE}
                      onPageChange={setUsersPage}
                    />
                  </div>
                  )
                )}

                {tab === 'licenses' && (
                  sectionLoading ? (
                    <TableTabSkeleton showSearch />
                  ) : (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                      <input
                        className="w-full sm:w-96 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white"
                        placeholder="Search key, user UUID, product, status..."
                        value={licenseSearch}
                        onChange={(e) => setLicenseSearch(e.target.value)}
                      />
                    </div>
                  <TableShell>
                    <table className="w-full text-sm">
                      <thead className="text-left text-[var(--muted)]">
                        <tr>
                          <th className="px-4 py-2">Key</th>
                          <th className="px-4 py-2">User</th>
                          <th className="px-4 py-2">Product</th>
                          <th className="px-4 py-2">Status</th>
                          <th className="px-4 py-2">Expires</th>
                          <th className="px-4 py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {licenses.map((l) => (
                          <tr key={l.id} className="border-t border-white/[0.08] text-white/90">
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs">{l.key_code}</span>
                                <button
                                  type="button"
                                  onClick={() => onCopyText(l.key_code, 'License key')}
                                  className="rounded border border-white/20 bg-white/5 px-2 py-0.5 text-[10px] text-white/90 hover:bg-white/10"
                                >
                                  Copy
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-2 font-mono text-xs">{l.user_id}</td>
                            <td className="px-4 py-2">{l.product_code}</td>
                            <td className="px-4 py-2 uppercase">{l.status}</td>
                            <td className="px-4 py-2">{l.expires_at ? new Date(l.expires_at).toLocaleString() : 'Never'}</td>
                            <td className="px-4 py-2 flex gap-2">
                              <button className="px-2 py-1 rounded bg-emerald-700/70 text-xs" onClick={() => onLicenseAction(l.id, 'renew')}>Renew</button>
                              <button className="px-2 py-1 rounded bg-amber-700/70 text-xs" onClick={() => onLicenseAction(l.id, 'reset_hwid')}>Reset HWID</button>
                              <button className="px-2 py-1 rounded bg-red-700/70 text-xs" onClick={() => onLicenseAction(l.id, 'delete')}>Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TableShell>
                  <PaginationControls
                    page={licensesPage}
                    totalPages={licensesTotalPages}
                    totalItems={licensesTotal}
                    pageSize={PAGE_SIZE}
                    onPageChange={setLicensesPage}
                  />
                  </div>
                  )
                )}

                {tab === 'topups' && (
                  sectionLoading ? (
                    <TableTabSkeleton showSearch />
                  ) : (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                      <input
                        className="w-full sm:w-96 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white"
                        placeholder="Search ID, user UUID, source, status, amount..."
                        value={topupSearch}
                        onChange={(e) => setTopupSearch(e.target.value)}
                      />
                    </div>
                  <TableShell>
                    <table className="w-full text-sm">
                      <thead className="text-left text-[var(--muted)]">
                        <tr>
                          <th className="px-4 py-2">ID</th>
                          <th className="px-4 py-2">User</th>
                          <th className="px-4 py-2">Amount</th>
                          <th className="px-4 py-2">Source</th>
                          <th className="px-4 py-2">Status</th>
                          <th className="px-4 py-2">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topups.map((t) => (
                          <tr key={t.id} className="border-t border-white/[0.08] text-white/90">
                            <td className="px-4 py-2 font-mono text-xs">{t.id}</td>
                            <td className="px-4 py-2 font-mono text-xs">{t.user_id}</td>
                            <td className="px-4 py-2">{formatTHB(t.amount_points)}</td>
                            <td className="px-4 py-2">{t.source}</td>
                            <td className="px-4 py-2 uppercase">{t.status}</td>
                            <td className="px-4 py-2">{new Date(t.created_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TableShell>
                  <PaginationControls
                    page={topupsPage}
                    totalPages={topupsTotalPages}
                    totalItems={topupsTotal}
                    pageSize={PAGE_SIZE}
                    onPageChange={setTopupsPage}
                  />
                  </div>
                  )
                )}

                {tab === 'audit' && (
                  sectionLoading ? (
                    <AuditSkeleton />
                  ) : (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                      <div className="relative">
                        <select
                          className={`${selectClassName} rounded-lg`}
                          value={filterAction}
                          onChange={(e) => setFilterAction(e.target.value)}
                        >
                          {auditActions.map((action) => (
                            <option key={action} value={action} className="bg-[#0b0b0f] text-white">
                              {action}
                            </option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/60">▼</span>
                      </div>
                      <input
                        className="px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white"
                        placeholder="Filter by actor UUID"
                        value={filterActor}
                        onChange={(e) => setFilterActor(e.target.value)}
                      />
                      <input
                        type="date"
                        className="px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white"
                        value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                      />
                      <input
                        type="date"
                        className="px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white"
                        value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                      />
                      <input
                        className="px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white"
                        placeholder="Search action, target, details..."
                        value={auditSearch}
                        onChange={(e) => setAuditSearch(e.target.value)}
                      />
                    </div>
                    <div className="md:hidden space-y-3">
                      {audits.map((a) => (
                        <div key={a.id} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 space-y-2">
                          <p className="text-xs text-white/60">{new Date(a.created_at).toLocaleString()}</p>
                          <p className="text-xs font-mono text-white/80 break-all">{a.actor_user_id}</p>
                          <span className="inline-flex rounded bg-red-700/20 px-2 py-1 text-[10px] font-semibold text-red-200">
                            {formatAuditAction(a.action)}
                          </span>
                          <div className="grid grid-cols-1 gap-1 text-[11px] text-white/70">
                            <p>Target User: <span className="font-mono break-all">{a.target_user_id || '-'}</span></p>
                            <p>Target License: <span className="font-mono break-all">{a.target_license_id || '-'}</span></p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setExpandedAuditId((prev) => (prev === a.id ? null : a.id))}
                            className="text-xs text-white/80 underline"
                          >
                            {expandedAuditId === a.id ? 'Hide details' : 'View details'}
                          </button>
                          {expandedAuditId === a.id && (
                            <pre className="max-h-44 overflow-auto rounded-md border border-white/[0.08] bg-black/30 p-2 text-[10px] text-white/75 whitespace-pre-wrap break-words">
                              {formatAuditDetails(a.details)}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="hidden md:block">
                      <TableShell>
                        <table className="w-full text-sm table-fixed min-w-[980px]">
                          <thead className="text-left text-[var(--muted)]">
                            <tr>
                              <th className="px-4 py-2 w-[165px]">Time</th>
                              <th className="px-4 py-2 w-[200px]">Actor</th>
                              <th className="px-4 py-2 w-[170px]">Action</th>
                              <th className="px-4 py-2 w-[180px]">Target User</th>
                              <th className="px-4 py-2 w-[190px]">Target License</th>
                              <th className="px-4 py-2">Details</th>
                            </tr>
                          </thead>
                          <tbody>
                            {audits.map((a) => (
                              <tr key={a.id} className="border-t border-white/[0.08] text-white/90 align-top">
                                <td className="px-4 py-2 text-xs text-white/75">{new Date(a.created_at).toLocaleString()}</td>
                                <td className="px-4 py-2 font-mono text-xs break-all text-white/85">{a.actor_user_id}</td>
                                <td className="px-4 py-2">
                                  <span className="inline-flex rounded bg-red-700/20 px-2 py-1 text-[10px] font-semibold text-red-200">
                                    {formatAuditAction(a.action)}
                                  </span>
                                </td>
                                <td className="px-4 py-2 font-mono text-xs break-all text-white/80">{a.target_user_id || '-'}</td>
                                <td className="px-4 py-2 font-mono text-xs break-all text-white/80">{a.target_license_id || '-'}</td>
                                <td className="px-4 py-2">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedAuditId((prev) => (prev === a.id ? null : a.id))}
                                    className="mb-1 text-[11px] text-white/75 underline"
                                  >
                                    {expandedAuditId === a.id ? 'Hide details' : 'View details'}
                                  </button>
                                  {expandedAuditId === a.id ? (
                                    <pre className="max-h-40 overflow-auto rounded-md border border-white/[0.08] bg-black/25 p-2 text-[10px] text-white/75 whitespace-pre-wrap break-words">
                                      {formatAuditDetails(a.details)}
                                    </pre>
                                  ) : (
                                    <p className="text-[11px] text-white/55 truncate">
                                      {JSON.stringify(a.details)}
                                    </p>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </TableShell>
                    </div>
                  <PaginationControls
                    page={auditsPage}
                    totalPages={auditsTotalPages}
                    totalItems={auditsTotal}
                    pageSize={PAGE_SIZE}
                    onPageChange={setAuditsPage}
                  />
                  {auditsFetchCap !== null && auditsTotal >= auditsFetchCap && (
                    <p className="text-xs text-amber-300/90">
                      Showing results from latest {auditsFetchCap} audit rows. Add DB paging RPC for unlimited audit history.
                    </p>
                  )}
                  </div>
                  )
                )}

                {tab === 'store' && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                      <h3 className="text-sm font-semibold text-white">Store Management</h3>
                      <p className="mt-1 text-xs text-white/65">
                        Add products, update prices, set discounts, edit image URL, and control visibility.
                      </p>
                    </div>

                    {storeLoading ? (
                      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-4">
                        <div className="rounded-xl border border-white/[0.08] bg-black/35 p-3 space-y-2">
                          <SkeletonBlock className="h-9 w-full" />
                          {Array.from({ length: 7 }).map((_, i) => (
                            <SkeletonBlock key={i} className="h-12 w-full" />
                          ))}
                        </div>
                        <div className="rounded-xl border border-white/[0.08] bg-black/30 p-4 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Array.from({ length: 8 }).map((_, i) => (
                              <SkeletonBlock key={i} className="h-10 w-full" />
                            ))}
                          </div>
                          <SkeletonBlock className="h-10 w-full" />
                          <SkeletonBlock className="h-9 w-44 ml-auto" />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-4">
                        <div className="rounded-xl border border-white/[0.08] bg-black/35 overflow-hidden">
                          <div className="px-3 py-2 border-b border-white/[0.08] text-xs text-[var(--muted)]">
                            Products ({storeProducts.length})
                          </div>
                          <div className="p-2 space-y-1 max-h-[520px] overflow-auto">
                            <button
                              type="button"
                              onClick={() => {
                                setStoreForm(createEmptyStoreForm(storeProducts));
                                setShowNewProductModal(true);
                              }}
                              className="w-full rounded-md border border-dashed border-white/25 px-3 py-2 text-xs text-white/80 hover:bg-white/[0.06]"
                            >
                              + New Product
                            </button>
                            {storeProducts.map((item) => (
                              <button
                                key={item.code}
                                type="button"
                                onClick={() => setStoreForm({ ...item, image_url: item.image_url ?? '' })}
                                className={`w-full text-left rounded-md px-3 py-2 border transition ${
                                  storeForm.code === item.code
                                    ? 'bg-red-700/20 border-red-700/50'
                                    : 'border-transparent hover:bg-white/[0.04]'
                                }`}
                              >
                                <p className="text-sm text-white truncate">{item.name}</p>
                                <p className="text-[11px] text-white/60 truncate">
                                  {item.code} • {item.is_active ? 'active' : 'inactive'}
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-xl border border-white/[0.08] bg-black/30 p-4 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <p className="mb-1 text-xs text-white/70">Code</p>
                              <input
                                value={storeForm.code}
                                onChange={(e) => setStoreForm((prev) => ({ ...prev, code: e.target.value }))}
                                disabled={Boolean(storeProducts.find((p) => p.code === storeForm.code))}
                                className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-white text-sm disabled:opacity-60"
                                placeholder="key_30d"
                              />
                            </div>
                            <div>
                              <p className="mb-1 text-xs text-white/70">Name</p>
                              <input
                                value={storeForm.name}
                                onChange={(e) => setStoreForm((prev) => ({ ...prev, name: e.target.value }))}
                                className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-white text-sm"
                                placeholder="Key 30Day"
                              />
                            </div>
                            <div>
                              <p className="mb-1 text-xs text-white/70">Category</p>
                              <select
                                value={storeForm.category}
                                onChange={(e) =>
                                  setStoreForm((prev) => ({
                                    ...prev,
                                    category: e.target.value as 'KEY' | 'RESETHWID',
                                    duration_days: e.target.value === 'KEY' ? (prev.duration_days ?? 30) : null,
                                  }))
                                }
                                className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-white text-sm"
                              >
                                <option value="KEY">KEY</option>
                                <option value="RESETHWID">RESETHWID</option>
                              </select>
                            </div>
                            <div>
                              <p className="mb-1 text-xs text-white/70">Duration Days (KEY only)</p>
                              <input
                                type="number"
                                min={1}
                                value={storeForm.duration_days ?? ''}
                                onChange={(e) =>
                                  setStoreForm((prev) => ({
                                    ...prev,
                                    duration_days: e.target.value ? Number(e.target.value) : null,
                                  }))
                                }
                                disabled={storeForm.category !== 'KEY'}
                                className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-white text-sm disabled:opacity-60"
                              />
                            </div>
                            <div>
                              <p className="mb-1 text-xs text-white/70">Price</p>
                              <input
                                type="number"
                                min={0}
                                value={storeForm.price_points}
                                onChange={(e) => setStoreForm((prev) => ({ ...prev, price_points: Number(e.target.value) }))}
                                className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-white text-sm"
                              />
                            </div>
                            <div>
                              <p className="mb-1 text-xs text-white/70">Discount %</p>
                              <input
                                type="number"
                                min={0}
                                max={90}
                                value={storeForm.discount_percent}
                              onFocus={(e) => e.currentTarget.select()}
                              onChange={(e) => {
                                const digitsOnly = e.target.value.replace(/\D/g, '');
                                const withoutLeadingZero = digitsOnly.replace(/^0+(?=\d)/, '');
                                const normalized = Number(withoutLeadingZero || '0');
                                setStoreForm((prev) => ({
                                  ...prev,
                                  discount_percent: Math.min(90, normalized),
                                }));
                              }}
                                className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-white text-sm"
                              />
                            </div>
                            <div>
                              <p className="mb-1 text-xs text-white/70">Sort Order</p>
                              <input
                                type="number"
                                value={storeForm.sort_order}
                                onChange={(e) => setStoreForm((prev) => ({ ...prev, sort_order: Number(e.target.value) }))}
                                className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-white text-sm"
                              />
                            </div>
                            <div className="flex items-end">
                              <label className="inline-flex items-center gap-2 text-sm text-white/80">
                                <input
                                  type="checkbox"
                                  checked={storeForm.is_active}
                                  onChange={(e) => setStoreForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                                />
                                Active
                              </label>
                            </div>
                          </div>

                          <div>
                            <p className="mb-1 text-xs text-white/70">Image URL (public path)</p>
                            <input
                              value={storeForm.image_url ?? ''}
                              onChange={(e) => setStoreForm((prev) => ({ ...prev, image_url: e.target.value }))}
                              className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-white text-sm"
                              placeholder="/assets/images/products/30day.png"
                            />
                          </div>

                          <div className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/70">
                            Final price preview: {formatNumber(Math.max(0, storeForm.price_points - Math.floor((storeForm.price_points * storeForm.discount_percent) / 100)))}
                          </div>

                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setRemoveProductConfirm({
                                  code: storeForm.code,
                                  name: storeForm.name,
                                })
                              }
                              disabled={storeRemoving || !storeForm.code}
                              className="px-4 py-2 rounded-md border border-red-500/40 bg-red-700/20 hover:bg-red-700/30 text-red-100 text-sm disabled:opacity-60"
                            >
                              {storeRemoving ? 'Removing...' : 'Remove Product'}
                            </button>
                            <button
                              type="button"
                              onClick={() => void onSaveStoreProduct()}
                              disabled={storeSaving}
                              className="px-4 py-2 rounded-md bg-red-700 hover:bg-red-600 text-white text-sm disabled:opacity-60"
                            >
                              {storeSaving ? 'Saving...' : 'Save Product'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
        <Footer />
        {showNewProductModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-2xl rounded-xl border border-white/10 bg-black p-4 sm:p-5 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">Create New Product</h3>
                <button
                  type="button"
                  onClick={() => setShowNewProductModal(false)}
                  className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="mb-1 text-xs text-white/70">Code</p>
                  <input
                    value={storeForm.code}
                    onChange={(e) => setStoreForm((prev) => ({ ...prev, code: e.target.value }))}
                    className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-white text-sm"
                    placeholder="key_30d"
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs text-white/70">Name</p>
                  <input
                    value={storeForm.name}
                    onChange={(e) => setStoreForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-white text-sm"
                    placeholder="Key 30Day"
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs text-white/70">Category</p>
                  <select
                    value={storeForm.category}
                    onChange={(e) =>
                      setStoreForm((prev) => ({
                        ...prev,
                        category: e.target.value as 'KEY' | 'RESETHWID',
                        duration_days: e.target.value === 'KEY' ? (prev.duration_days ?? 30) : null,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-white text-sm"
                  >
                    <option value="KEY">KEY</option>
                    <option value="RESETHWID">RESETHWID</option>
                  </select>
                </div>
                <div>
                  <p className="mb-1 text-xs text-white/70">Duration Days (KEY only)</p>
                  <input
                    type="number"
                    min={1}
                    value={storeForm.duration_days ?? ''}
                    onChange={(e) =>
                      setStoreForm((prev) => ({
                        ...prev,
                        duration_days: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                    disabled={storeForm.category !== 'KEY'}
                    className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-white text-sm disabled:opacity-60"
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs text-white/70">Price</p>
                  <input
                    type="number"
                    min={0}
                    value={storeForm.price_points}
                    onChange={(e) => setStoreForm((prev) => ({ ...prev, price_points: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-white text-sm"
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs text-white/70">Discount %</p>
                  <input
                    type="number"
                    min={0}
                    max={90}
                    value={storeForm.discount_percent}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, '');
                      const withoutLeadingZero = digitsOnly.replace(/^0+(?=\d)/, '');
                      const normalized = Number(withoutLeadingZero || '0');
                      setStoreForm((prev) => ({
                        ...prev,
                        discount_percent: Math.min(90, normalized),
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-white text-sm"
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs text-white/70">Sort Order</p>
                  <input
                    type="number"
                    value={storeForm.sort_order}
                    onChange={(e) => setStoreForm((prev) => ({ ...prev, sort_order: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-white text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 text-sm text-white/80">
                    <input
                      type="checkbox"
                      checked={storeForm.is_active}
                      onChange={(e) => setStoreForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                    />
                    Active
                  </label>
                </div>
              </div>

              <div className="mt-3">
                <p className="mb-1 text-xs text-white/70">Image URL (public path)</p>
                <input
                  value={storeForm.image_url ?? ''}
                  onChange={(e) => setStoreForm((prev) => ({ ...prev, image_url: e.target.value }))}
                  className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-white text-sm"
                  placeholder="/assets/images/products/30day.png"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewProductModal(false)}
                  className="rounded-md border border-white/15 bg-white/5 px-3.5 py-2 text-sm text-white hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void onSaveStoreProduct()}
                  disabled={storeSaving}
                  className="rounded-md bg-red-700/85 px-3.5 py-2 text-sm font-medium text-white hover:bg-red-600/85 disabled:opacity-60"
                >
                  {storeSaving ? 'Saving...' : 'Create Product'}
                </button>
              </div>
            </div>
          </div>
        )}
        {removeProductConfirm && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-md rounded-xl border border-white/10 bg-black p-4 sm:p-5 shadow-xl">
              <p className="text-xs uppercase tracking-[0.14em] text-white/55">Confirm Remove Product</p>
              <h3 className="mt-2 text-base font-semibold text-white">Remove this product?</h3>
              <p className="mt-2 text-sm text-white/75 break-all">
                {removeProductConfirm.name || '-'}
              </p>
              <p className="mt-1 text-xs font-mono text-white/60">{removeProductConfirm.code}</p>
              <p className="mt-3 text-xs text-white/55">
                If this product has purchase history, it will be deactivated instead of hard deleted.
              </p>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRemoveProductConfirm(null)}
                  className="rounded-md border border-white/15 bg-white/5 px-3.5 py-2 text-sm text-white hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRemoveProductConfirm(null);
                    void onRemoveStoreProduct();
                  }}
                  disabled={storeRemoving}
                  className="rounded-md bg-red-700/85 px-3.5 py-2 text-sm font-medium text-white hover:bg-red-600/85 disabled:opacity-60"
                >
                  {storeRemoving ? 'Removing...' : 'Confirm Remove'}
                </button>
              </div>
            </div>
          </div>
        )}
        {roleConfirm && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-md rounded-xl border border-white/10 bg-black p-4 sm:p-5 shadow-xl">
              <p className="text-xs uppercase tracking-[0.14em] text-white/55">Confirm Role Change</p>
              <h3 className="mt-2 text-base font-semibold text-white">Apply this change?</h3>
              <p className="mt-2 text-sm text-white/75 break-all">
                {roleConfirm.email || roleConfirm.userId}
              </p>
              <p className="mt-1 text-sm text-white/65">
                from{' '}
                <span className="font-semibold text-white">
                  {roleConfirm.from === 'admin' ? 'Admin' : 'User'}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-white">
                  {roleConfirm.to === 'admin' ? 'Admin' : 'User'}
                </span>
              </p>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRoleConfirm(null)}
                  className="rounded-md border border-white/15 bg-white/5 px-3.5 py-2 text-sm text-white hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const pending = roleConfirm;
                    setRoleConfirm(null);
                    void onSetRole(pending.userId, pending.to);
                  }}
                  className="rounded-md bg-red-700/85 px-3.5 py-2 text-sm font-medium text-white hover:bg-red-600/85"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-black/85 border border-white/10 px-4 py-2 text-sm text-white z-[60]">
            {toast}
          </div>
        )}
      </div>
    </ProtectedPageGate>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/10 ${className}`} />;
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-7 w-20" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-4">
        <SkeletonBlock className="h-4 w-48" />
        <div className="grid grid-cols-7 gap-2 items-end h-48">
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

function UsersSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <SkeletonBlock className="h-10 w-64" />
          <SkeletonBlock className="h-10 w-72" />
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-4">
          <div className="rounded-xl border border-white/[0.08] bg-black/35 p-3 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-12 w-full" />
            ))}
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-black/30 p-4 space-y-3">
            <SkeletonBlock className="h-20 w-full" />
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-24 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
      <TableTabSkeleton />
    </div>
  );
}

function TableTabSkeleton({ showSearch = false }: { showSearch?: boolean }) {
  return (
    <div className="space-y-4">
      {showSearch && (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <SkeletonBlock className="h-10 w-full sm:w-96" />
        </div>
      )}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-8 w-full" />
        ))}
      </div>
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 flex items-center justify-between">
        <SkeletonBlock className="h-3 w-40" />
        <SkeletonBlock className="h-8 w-36" />
      </div>
    </div>
  );
}

function AuditSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-10 w-full" />
        ))}
      </div>
      <TableTabSkeleton />
    </div>
  );
}

function TableShell({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-auto">{children}</div>;
}

function PaginationControls({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const hasMultiplePages = totalPages > 1;
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
      <p className="text-xs text-[var(--muted)]">
        Showing {start}-{end} of {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasMultiplePages || page <= 1}
          className="px-3 py-1.5 rounded-md border border-white/15 bg-white/5 text-xs text-white disabled:opacity-40"
        >
          Prev
        </button>
        <span className="text-xs text-white/80">
          Page {page}/{totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasMultiplePages || page >= totalPages}
          className="px-3 py-1.5 rounded-md border border-white/15 bg-white/5 text-xs text-white disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
