'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Header, Footer } from '@/components/layout';
import { ProtectedPageGate } from '@/components/auth/ProtectedPageGate';

function formatRemaining(expiresAt: string | null, nowTs: number) {
  if (!expiresAt) return 'Never';
  const remain = new Date(expiresAt).getTime() - nowTs;
  if (remain <= 0) return 'Expired';
  const sec = Math.floor(remain / 1000);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

const PRODUCT_LABEL_BY_CODE: Record<string, string> = {
  key_1d: 'Key 1Day',
  key_3d: 'Key 3Day',
  key_7d: 'Key 7Day',
  key_14d: 'Key 14Day',
  key_30d: 'Key 30Day',
  key_lifetime: 'Key Lifetime',
  reset_hwid: 'ResetHWID',
};

function formatPlanLabel(productCode: string) {
  const known = PRODUCT_LABEL_BY_CODE[productCode];
  if (known) return known;
  return productCode
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function LicenseHistoryClient() {
  const [nowTs, setNowTs] = useState(Date.now());
  const [resetCredits, setResetCredits] = useState(0);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [resettingLicenseId, setResettingLicenseId] = useState<string | null>(null);
  const [licenses, setLicenses] = useState<Array<{
    id: string;
    product_code: string;
    key_code: string;
    status: 'active' | 'expired' | 'revoked';
    issued_at: string;
    expires_at: string | null;
    bound_device_hash: string | null;
    reset_hwid_count: number;
  }>>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/license/history', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { licenses?: typeof licenses; resetCredits?: number };
        setLicenses(Array.isArray(data.licenses) ? data.licenses : []);
        setResetCredits(typeof data.resetCredits === 'number' ? data.resetCredits : 0);
      } catch {
        // ignore
      }
    };
    void load();
  }, []);

  const reloadLicenses = async () => {
    const res = await fetch('/api/license/history', { cache: 'no-store' });
    if (!res.ok) return;
    const data = (await res.json()) as { licenses?: typeof licenses; resetCredits?: number };
    setLicenses(Array.isArray(data.licenses) ? data.licenses : []);
    setResetCredits(typeof data.resetCredits === 'number' ? data.resetCredits : 0);
  };

  const handleResetHwid = async (licenseId: string) => {
    if (resetCredits <= 0) {
      setActionMessage('โควต้า Reset HWID หมดแล้ว กรุณาซื้อเพิ่มก่อนใช้งาน');
      return;
    }

    setResettingLicenseId(licenseId);
    setActionMessage(null);
    try {
      const res = await fetch('/api/license/use-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseId }),
      });
      const payload = (await res.json()) as {
        error?: string;
        remainingResetCredits?: number;
      };
      if (!res.ok) {
        if (payload.error?.includes('NO_RESET_CREDIT')) {
          setActionMessage('โควต้า Reset HWID หมดแล้ว กรุณาซื้อเพิ่มก่อนใช้งาน');
        } else {
          setActionMessage(payload.error ?? 'รีเซ็ต HWID ไม่สำเร็จ กรุณาลองใหม่');
        }
        return;
      }

      setActionMessage(null);
      await reloadLicenses();
    } catch {
      setActionMessage('รีเซ็ต HWID ไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setResettingLicenseId(null);
    }
  };

  const handleCopyKey = async (keyCode: string) => {
    try {
      await navigator.clipboard.writeText(keyCode);
      setActionMessage('License key copied');
    } catch {
      setActionMessage('Copy failed, please try again');
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!actionMessage) return;
    const timer = setTimeout(() => setActionMessage(null), 2200);
    return () => clearTimeout(timer);
  }, [actionMessage]);

  return (
    <ProtectedPageGate>
      <div className="min-h-screen relative">
        <Header />
        <main className="overflow-x-hidden pt-20 sm:pt-24 pb-16 sm:pb-20 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-red-800 mb-2">License</p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">License History</h1>
            <p className="mt-3 text-sm text-[var(--muted)]">Track device-bound keys, status, and validity period.</p>
            {actionMessage && (
              <p className="mt-3 text-xs text-white/75">{actionMessage}</p>
            )}
          </motion.div>

          <div className="grid grid-cols-1 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between gap-3">
                <h2 className="text-white font-semibold">Key Activity</h2>
                <div className="inline-flex items-center gap-2 rounded-md border border-white/15 px-2.5 py-1">
                  <span className="text-[10px] uppercase tracking-[0.16em] text-white/70">ResetHWID</span>
                  <span className="inline-flex h-6 min-w-6 items-center justify-center px-1 text-sm font-bold text-red-400">
                    {resetCredits}
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-[var(--muted)]">
                    <tr className="border-b border-white/[0.06]">
                      <th className="px-5 py-3">License Key</th>
                      <th className="px-5 py-3">Device</th>
                      <th className="px-5 py-3">Plan</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Start</th>
                      <th className="px-5 py-3">End</th>
                      <th className="px-5 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {licenses.map((row) => (
                      <tr key={row.id} className="border-b border-white/[0.04] text-white/90">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs">{row.key_code}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyKey(row.key_code)}
                              className="ml-3 rounded border border-white/20 bg-white/5 px-2 py-0.5 text-[10px] text-white/90 hover:bg-white/10"
                            >
                              Copy
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-[var(--muted)]">{row.bound_device_hash ? row.bound_device_hash.slice(0, 12) : '-'}</td>
                        <td className="px-5 py-3">{formatPlanLabel(row.product_code)}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${row.status === 'active' ? 'bg-red-600/20 text-red-300' : 'bg-slate-500/20 text-slate-300'}`}>
                            {row.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-[var(--muted)]">{new Date(row.issued_at).toLocaleString()}</td>
                        <td className="px-5 py-3 text-[var(--muted)]">{formatRemaining(row.expires_at, nowTs)}</td>
                        <td className="px-5 py-3">
                          <button
                            type="button"
                            onClick={() => handleResetHwid(row.id)}
                            disabled={
                              row.status !== 'active' ||
                              resettingLicenseId === row.id ||
                              resetCredits <= 0
                            }
                            className="rounded-md border border-red-500/40 bg-red-600/80 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-500 disabled:border-white/[0.14] disabled:bg-white/[0.03] disabled:font-normal disabled:text-white/90 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {resettingLicenseId === row.id ? 'Resetting...' : 'Reset HWID'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
          </div>
        </main>
        <Footer />
      </div>
    </ProtectedPageGate>
  );
}
