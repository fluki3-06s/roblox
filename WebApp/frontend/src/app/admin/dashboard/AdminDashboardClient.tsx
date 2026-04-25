'use client';

import { useEffect, useMemo, useState } from 'react';
import { Header, Footer } from '@/components/layout';
import { ProtectedPageGate } from '@/components/auth/ProtectedPageGate';

type AdminSummary = {
  usersCount: number;
  activeLicensesCount: number;
  totalTopups: number;
  totalRevenuePoints: number;
  online24h: number;
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

const formatTHB = (amount: number) =>
  new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(amount);
const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(value);
const selectClassName =
  'w-full appearance-none rounded-md border border-white/10 bg-black/40 px-3 py-2 pr-9 text-sm text-white outline-none transition focus:border-red-700/60 focus:ring-2 focus:ring-red-700/30';

export default function AdminDashboardClient() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [tab, setTab] = useState<'overview' | 'users' | 'licenses' | 'topups' | 'audit'>('overview');
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
  const [toast, setToast] = useState<string | null>(null);

  const productCodes = useMemo(
    () => ['key_1d', 'key_3d', 'key_7d', 'key_14d', 'key_30d', 'key_lifetime'],
    []
  );
  const selectedUser = useMemo(
    () => users.find((u) => u.user_id === selectedUserId) ?? null,
    [users, selectedUserId]
  );
  const productLabelByCode: Record<string, string> = {
    key_1d: 'Key 1Day',
    key_3d: 'Key 3Day',
    key_7d: 'Key 7Day',
    key_14d: 'Key 14Day',
    key_30d: 'Key 30Day',
    key_lifetime: 'Key Lifetime',
  };
  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.email || '').toLowerCase().includes(q) ||
        u.user_id.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

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

    const map = new Map(days.map((item) => [item.key, item]));
    topups.forEach((row) => {
      if (row.status !== 'success') return;
      const key = new Date(row.created_at).toISOString().slice(0, 10);
      const target = map.get(key);
      if (target) target.value += row.amount_points;
    });

    return days;
  }, [topups]);

  const auditActions = useMemo(() => {
    const set = new Set<string>();
    audits.forEach((item) => set.add(item.action));
    return ['ALL', ...Array.from(set).sort()];
  }, [audits]);

  const filteredAudits = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    return audits.filter((item) => {
      if (filterAction !== 'ALL' && item.action !== filterAction) return false;
      if (filterActor.trim()) {
        const needle = filterActor.trim().toLowerCase();
        if (!item.actor_user_id.toLowerCase().includes(needle)) return false;
      }

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

      if (q) {
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
        if (!rowText.includes(q)) return false;
      }

      return true;
    });
  }, [audits, filterAction, filterActor, filterDateFrom, filterDateTo, auditSearch]);

  const filteredLicenses = useMemo(() => {
    const q = licenseSearch.trim().toLowerCase();
    if (!q) return licenses;
    return licenses.filter((item) => {
      const rowText = [item.key_code, item.user_id, item.product_code, item.status, item.id]
        .join(' ')
        .toLowerCase();
      return rowText.includes(q);
    });
  }, [licenses, licenseSearch]);

  const filteredTopups = useMemo(() => {
    const q = topupSearch.trim().toLowerCase();
    if (!q) return topups;
    return topups.filter((item) => {
      const rowText = [item.id, item.user_id, item.source, item.status, String(item.amount_points)]
        .join(' ')
        .toLowerCase();
      return rowText.includes(q);
    });
  }, [topups, topupSearch]);

  const loadOverview = async () => {
    const res = await fetch('/api/admin/overview', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load admin data');
    const data = (await res.json()) as {
      summary: AdminSummary;
      users: AdminUser[];
      licenses: AdminLicense[];
      topups: AdminTopup[];
      admins: Array<{ user_id: string }>;
      audits: AdminAuditLog[];
    };
    setSummary(data.summary);
    setUsers(data.users);
    setLicenses(data.licenses);
    setTopups(data.topups);
    setAdminUserIds((data.admins ?? []).map((item) => item.user_id));
    setAudits(data.audits ?? []);
    if (!selectedUserId && data.users.length > 0) {
      setSelectedUserId(data.users[0].user_id);
    }
  };

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
        await loadOverview();
      } catch {
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, []);

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
                  {(['overview', 'users', 'licenses', 'topups', 'audit'] as const).map((item) => (
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

                {tab === 'overview' && summary && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                      <Card label="Users" value={String(summary.usersCount)} />
                      <Card label="Active Licenses" value={String(summary.activeLicensesCount)} />
                      <Card label="Topups" value={String(summary.totalTopups)} />
                      <Card label="Revenue" value={formatTHB(summary.totalRevenuePoints)} />
                      <Card label="Online 24h" value={String(summary.online24h)} />
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
                )}

                {tab === 'users' && (
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

                      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-4">
                        <div className="rounded-xl border border-white/[0.08] bg-black/35 overflow-hidden">
                          <div className="px-3 py-2 border-b border-white/[0.08] text-xs text-[var(--muted)]">
                            Users ({filteredUsers.length})
                          </div>
                          <div className="p-2 space-y-1 max-h-[420px] overflow-auto">
                            {filteredUsers.map((u) => {
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
                            {filteredUsers.length === 0 && (
                              <p className="px-3 py-6 text-sm text-[var(--muted)] text-center">No users found.</p>
                            )}
                          </div>
                        </div>

                        <div className="rounded-xl border border-white/[0.08] bg-black/30 p-4 space-y-4">
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                                  <div className="rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2">
                                    <p className="text-[11px] text-[var(--muted)]">Points</p>
                                    <p className="text-base font-semibold text-white">{formatNumber(selectedUser.points)}</p>
                                  </div>
                                  <div className="rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2">
                                    <p className="text-[11px] text-[var(--muted)]">Topups</p>
                                    <p className="text-base font-semibold text-white">{selectedUser.total_topups}</p>
                                  </div>
                                  <div className="rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2">
                                    <p className="text-[11px] text-[var(--muted)]">Active Keys</p>
                                    <p className="text-base font-semibold text-white">{selectedUser.active_licenses}</p>
                                  </div>
                                  <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
                                    <p className="text-[11px] text-red-200/80">ResetHWID Credits</p>
                                    <p className="text-base font-semibold text-red-200">{selectedUser.reset_credits_available}</p>
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
                                      <option value="admin" className="bg-[#0b0b0f] text-white">Set Admin</option>
                                      <option value="user" className="bg-[#0b0b0f] text-white">Set User</option>
                                    </select>
                                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/60">▼</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => onSetRole(selectedUser.user_id, roleAction)}
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
                  </div>
                )}

                {tab === 'licenses' && (
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
                        {filteredLicenses.map((l) => (
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
                  </div>
                )}

                {tab === 'topups' && (
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
                        {filteredTopups.map((t) => (
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
                  </div>
                )}

                {tab === 'audit' && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
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
                    <TableShell>
                    <table className="w-full text-sm">
                      <thead className="text-left text-[var(--muted)]">
                        <tr>
                          <th className="px-4 py-2">Time</th>
                          <th className="px-4 py-2">Actor</th>
                          <th className="px-4 py-2">Action</th>
                          <th className="px-4 py-2">Target User</th>
                          <th className="px-4 py-2">Target License</th>
                          <th className="px-4 py-2">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAudits.map((a) => (
                          <tr key={a.id} className="border-t border-white/[0.08] text-white/90">
                            <td className="px-4 py-2">{new Date(a.created_at).toLocaleString()}</td>
                            <td className="px-4 py-2 font-mono text-xs">{a.actor_user_id}</td>
                            <td className="px-4 py-2 uppercase">{a.action}</td>
                            <td className="px-4 py-2 font-mono text-xs">{a.target_user_id || '-'}</td>
                            <td className="px-4 py-2 font-mono text-xs">{a.target_license_id || '-'}</td>
                            <td className="px-4 py-2 text-xs">{JSON.stringify(a.details)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TableShell>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
        <Footer />
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

function TableShell({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-auto">{children}</div>;
}
