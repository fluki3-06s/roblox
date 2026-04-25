'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Header, Footer } from '@/components/layout';
import { ProtectedPageGate } from '@/components/auth/ProtectedPageGate';

const formatTHB = (amount: number) =>
  new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(amount);

export default function TopupHistoryClient() {
  const [history, setHistory] = useState<Array<{
    id: string;
    amount_points: number;
    source: string;
    status: string;
    created_at: string;
  }>>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/topup/history', { cache: 'no-store' });
        if (!res.ok) return;
        const body = (await res.json()) as { history?: typeof history };
        setHistory(Array.isArray(body.history) ? body.history : []);
      } catch {
        // keep empty
      }
    };
    void load();
  }, []);

  const bars = useMemo(() => {
    const daily = new Map<string, number>();
    history.forEach((item) => {
      const key = new Date(item.created_at).toISOString().slice(0, 10);
      daily.set(key, (daily.get(key) ?? 0) + item.amount_points);
    });
    return Array.from(daily.values()).slice(-7);
  }, [history]);

  const hasTopupData = bars.length > 0;

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
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-red-800 mb-2">Wallet</p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">Topup History</h1>
            <p className="mt-3 text-sm text-[var(--muted)]">All redeemed vouchers and wallet credits.</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2 rounded-xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-white/[0.08]">
                <h2 className="text-white font-semibold">Transaction Table</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-[var(--muted)]">
                    <tr className="border-b border-white/[0.06]">
                      <th className="px-5 py-3">ID</th>
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3">Fee</th>
                      <th className="px-5 py-3">Net</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row) => (
                      <tr key={row.id} className="border-b border-white/[0.04] text-white/90">
                        <td className="px-5 py-3 font-mono text-xs">{row.id}</td>
                        <td className="px-5 py-3">{formatTHB(row.amount_points)}</td>
                        <td className="px-5 py-3">{formatTHB(0)}</td>
                        <td className="px-5 py-3">{formatTHB(row.amount_points)}</td>
                        <td className="px-5 py-3">
                          <span className="px-2 py-1 rounded bg-emerald-500/15 text-emerald-300 text-xs uppercase">{row.status}</span>
                        </td>
                        <td className="px-5 py-3 text-[var(--muted)]">{new Date(row.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="rounded-xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm p-5"
            >
              <h2 className="text-white font-semibold mb-4">7-Day Bar Chart</h2>
              {hasTopupData ? (
                <>
                  <div className="h-44 flex items-end gap-2">
                    {bars.map((value, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t bg-gradient-to-t from-red-800/80 to-red-500/80"
                        style={{ height: `${Math.max(18, (value / 600) * 100)}%` }}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-3">Daily topup volume in THB.</p>
                </>
              ) : (
                <div className="h-44 rounded-lg border border-white/[0.08] bg-white/[0.02] flex items-center justify-center text-sm text-[var(--muted)]">
                  No topup data yet.
                </div>
              )}
            </motion.div>
          </div>
          </div>
        </main>
        <Footer />
      </div>
    </ProtectedPageGate>
  );
}
